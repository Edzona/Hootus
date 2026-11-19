import { Router } from 'express';
import {
  createReport, deleteContent, getModerationContent, getModerationReports, moderationContentBody,
  moderationContentParams, moderationContentQuery, moderationReportBody, moderationReportParams,
  reportBody, reportListQuery, setContentHidden, updateModerationReport,
} from '../controllers/moderation.controller.js';
import { validate } from '../middleware/validate.js';

export const reportsRoutes = Router();
reportsRoutes.post('/', validate(reportBody), createReport);

export const moderationRoutes = Router();
moderationRoutes.get('/reports', validate(reportListQuery, 'query'), getModerationReports);
moderationRoutes.patch('/reports/:id', validate(moderationReportParams, 'params'), validate(moderationReportBody), updateModerationReport);
moderationRoutes.get('/content', validate(moderationContentQuery, 'query'), getModerationContent);
moderationRoutes.patch('/content/:kind/:id', validate(moderationContentParams, 'params'), validate(moderationContentBody), setContentHidden);
moderationRoutes.delete('/content/:kind/:id', validate(moderationContentParams, 'params'), deleteContent);
