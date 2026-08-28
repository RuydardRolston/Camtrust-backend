import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
} from "../controllers/notificationController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const notificationRouter = express.Router();

notificationRouter.get("/", authenticateToken, getMyNotifications);
notificationRouter.put("/:id/read", authenticateToken, markNotificationRead);

export default notificationRouter;
