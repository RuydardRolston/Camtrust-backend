import express from "express";
import {
  getContacts,
  getConversation,
  sendMessage,
  getUnreadCount,
} from "../controllers/messageController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const messageRouter = express.Router();

messageRouter.get("/contacts", authenticateToken, getContacts);
messageRouter.get("/unread-count", authenticateToken, getUnreadCount);
messageRouter.get("/:partnerId", authenticateToken, getConversation);
messageRouter.post("/", authenticateToken, sendMessage);

export default messageRouter;
