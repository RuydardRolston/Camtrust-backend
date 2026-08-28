import express from "express";
import {
  createMilestone,
  updateMilestone,
  getMilestones,
  getMyMilestones,
} from "../controllers/milestoneController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const milestoneRouter = express.Router();

milestoneRouter.post("/create", authenticateToken, createMilestone);
milestoneRouter.get("/", authenticateToken, getMilestones);
milestoneRouter.get("/my", authenticateToken, getMyMilestones);
milestoneRouter.put("/:id", authenticateToken, updateMilestone);

export default milestoneRouter;
