import express from "express";
import {
  proposeProfessional,
  acceptAssignment,
  rejectAssignment,
  getPendingAssignments,
} from "../controllers/assignmentProposalController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const assignmentProposalRouter = express.Router();

assignmentProposalRouter.post("/propose", authenticateToken, authorizeRoles("administrator"), proposeProfessional);
assignmentProposalRouter.post("/:id/accept", authenticateToken, acceptAssignment);
assignmentProposalRouter.post("/:id/reject", authenticateToken, rejectAssignment);
assignmentProposalRouter.get("/pending", authenticateToken, getPendingAssignments);

export default assignmentProposalRouter;
