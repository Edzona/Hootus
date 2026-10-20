import { HttpError } from './helpers/errors.js';
import { ErrorCode } from './types/errorCode.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { routes } from './routes/index.js';
import { healthRoutes } from './routes/health.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();
app.disable('x-powered-by');
app.use(requestLogger);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.CORS_ORIGINS.includes(origin)) callback(null, true);
    else callback(new HttpError(403, ErrorCode.OriginNotAllowed, 'This origin is not allowed.'));
  },
  allowedHeaders: ['Authorization', 'Content-Type'],
  exposedHeaders: ['X-Request-Id'],
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express.json({ limit: '100kb' }));
app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use(healthRoutes);
app.use('/api', routes);
app.use((_req, _res, next) => next(new HttpError(404, ErrorCode.NotFound, 'Endpoint not found.')));
app.use(errorHandler);
export default app;
