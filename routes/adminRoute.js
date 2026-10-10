import express from "express";
import { getPlatformStats, toggleUserStatus } from "../controllers/adminController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const adminRouter = express.Router();

adminRouter.get("/stats", getPlatformStats);
adminRouter.put("/users/:id/status", toggleUserStatus);
adminRouter.patch("/users/:id/status", toggleUserStatus);

export default adminRouter;
