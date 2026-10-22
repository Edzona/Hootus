import app from './app.js';
import { env } from './config/env.js';
import { logger } from './helpers/logger.js';

app.listen(env.PORT, error => {
  if (error) throw error;
  logger.info('Hootus API listening on http://localhost:%d', env.PORT);
});
