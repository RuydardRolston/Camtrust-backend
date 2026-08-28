import express from "express";
import {
  uploadEvidenceMiddleware,
  uploadEvidence,
  getEvidence,
} from "../controllers/evidenceController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const evidenceRouter = express.Router();

evidenceRouter.post("/upload", authenticateToken, uploadEvidenceMiddleware, uploadEvidence);
evidenceRouter.get("/", authenticateToken, getEvidence);

export default evidenceRouter;
