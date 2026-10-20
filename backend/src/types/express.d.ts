import type { UserDatabase } from '../config/database.js';
import type { UserRole } from './domain.js';

export interface AuthUser {
  id: string; // Public profile UUID
  internalId: string; // bigint cast to text to avoid JavaScript precision loss
  email: string;
  role: UserRole;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      db?: UserDatabase;
    }
  }
}
