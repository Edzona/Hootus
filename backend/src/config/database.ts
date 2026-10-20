import type { IDatabaseConnection } from '@pgtyped/runtime';
import postgres from 'postgres';
import { env } from './env.js';
import { databaseError, HttpError } from '../helpers/errors.js';
import { ErrorCode } from '../types/errorCode.js';

export type UserDatabase = <T>(work: (tx: postgres.TransactionSql & IDatabaseConnection) => Promise<T>) => Promise<T>;

// Reuse a small pool per function instance. Transaction pooling needs no
// prepared statements or persistent session state.
export const sql = postgres(env.DATABASE_URL, {
  max: 3,
  prepare: false,
  idle_timeout: 10,
  connect_timeout: 10,
  ssl: ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(env.DATABASE_URL).hostname)
    ? false : { rejectUnauthorized: true },
  onnotice: () => {},
});

export async function withUser<T>(
  authUserId: string,
  work: (tx: postgres.TransactionSql & IDatabaseConnection) => Promise<T>,
): Promise<T> {
  try {
    let result!: T;
    await sql.begin(async tx => {
      await tx`set local role hootus_api`;
      await tx`select set_config('request.jwt.claim.sub', ${authUserId}, true)`;
      await tx`set local statement_timeout = '10s'`;
      // PgTyped sends SQL and bindings separately; Postgres.js binds them as parameters.
      const connection = Object.assign(tx, {
        query: async (text: string, bindings: postgres.ParameterOrJSON<never>[]) => {
          const rows = await tx.unsafe(text, bindings.map(value => value ?? null));
          return { rows: [...rows], rowCount: rows.count };
        },
      });
      result = await work(connection);
    });
    return result;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof postgres.PostgresError) databaseError(error);
    throw new HttpError(502, ErrorCode.DatabaseError, 'The database request failed.');
  }
}
