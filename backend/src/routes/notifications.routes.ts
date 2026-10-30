import { Router } from "express";
import { pageSchema } from "../helpers/validation.js";
import { validate } from "../middleware/validate.js";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  notificationParams,
} from "../controllers/notifications.controller.js";

export const notificationsRoutes = Router();

notificationsRoutes.get("/", validate(pageSchema, "query"), getNotifications);
notificationsRoutes.get("/unread-count", getUnreadCount);
notificationsRoutes.post("/read-all", markAllNotificationsRead);
notificationsRoutes.post(
  "/:notificationId/read",
  validate(notificationParams, "params"),
  markNotificationRead,
);
