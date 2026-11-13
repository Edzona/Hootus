import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  getPushConfig,
  savePushSubscription,
  deletePushSubscription,
  saveSubscriptionBody,
  deleteSubscriptionBody,
} from '../controllers/push.controller.js';

export const pushRoutes = Router();

pushRoutes.get('/config', getPushConfig);
pushRoutes.post('/subscriptions', validate(saveSubscriptionBody), savePushSubscription);
pushRoutes.delete('/subscriptions', validate(deleteSubscriptionBody), deletePushSubscription);
