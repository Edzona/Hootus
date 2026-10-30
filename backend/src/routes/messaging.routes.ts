import { Router } from "express";
import { pageSchema } from "../helpers/validation.js";
import { validate } from "../middleware/validate.js";
import {
  startConversation,
  getInbox,
  getConversation,
  getConversationMessages,
  sendMessage,
  listingParams,
  conversationParams,
  messagesQuery,
  sendMessageBody,
} from "../controllers/messaging.controller.js";

export const messagingRoutes = Router();

messagingRoutes.post(
  "/listings/:listingId/conversations",
  validate(listingParams, "params"),
  startConversation,
);
messagingRoutes.get("/conversations", validate(pageSchema, "query"), getInbox);
messagingRoutes.get(
  "/conversations/:conversationId",
  validate(conversationParams, "params"),
  getConversation,
);
messagingRoutes.get(
  "/conversations/:conversationId/messages",
  validate(conversationParams, "params"),
  validate(messagesQuery, "query"),
  getConversationMessages,
);
messagingRoutes.post(
  "/conversations/:conversationId/messages",
  validate(conversationParams, "params"),
  validate(sendMessageBody),
  sendMessage,
);
