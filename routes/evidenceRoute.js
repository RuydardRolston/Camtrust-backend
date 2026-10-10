import express from "express";
import {
  uploadEvidenceMiddleware,
  uploadEvidence,
  getEvidence,
  getProjectEvidence,
  getAllEvidence,
} from "../controllers/evidenceController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const evidenceRouter = express.Router();

evidenceRouter.post("/upload", authenticateToken, uploadEvidenceMiddleware, uploadEvidence);
evidenceRouter.get("/", authenticateToken, getEvidence);
evidenceRouter.get("/project/:projectId", authenticateToken, getProjectEvidence);
evidenceRouter.get("/all", authenticateToken, getAllEvidence);

export default evidenceRouter;
