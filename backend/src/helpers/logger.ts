import 'dotenv/config';
import createDebug from 'debug';

export const logger = {
  info: createDebug('hootus:info'),
  warn: createDebug('hootus:warn'),
  error: createDebug('hootus:error'),
};

// Express may import debug before dotenv loads. Apply the configured namespaces.
createDebug.enable(process.env.DEBUG ?? '');
