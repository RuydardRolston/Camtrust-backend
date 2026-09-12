import express from "express";
import {
  assignProfessional,
  getVerifiedEngineers,
  getProjectAssignments,
  getMyAssignments,
} from "../controllers/assignmentController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const assignmentRouter = express.Router();

assignmentRouter.post("/assign", assignProfessional);
assignmentRouter.post("/", assignProfessional);
assignmentRouter.get("/verified-engineers", getVerifiedEngineers);
assignmentRouter.get("/", authenticateToken, getProjectAssignments);
assignmentRouter.get("/project/:projectId", authenticateToken, getProjectAssignments);
assignmentRouter.get("/my", authenticateToken, getMyAssignments);

export default assignmentRouter;
