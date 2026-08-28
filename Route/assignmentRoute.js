import express from "express";
import {
  assignProfessional,
  getProjectAssignments,
  getMyAssignments,
} from "../controllers/assignmentController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const assignmentRouter = express.Router();

assignmentRouter.post("/assign", assignProfessional);
assignmentRouter.get("/", authenticateToken, getProjectAssignments);
assignmentRouter.get("/my", authenticateToken, getMyAssignments);

export default assignmentRouter;
