import express from "express";
import {
  uploadEvidenceMiddleware,
  uploadEvidence,
  getEvidence,
  getAllEvidence,
} from "../controllers/evidenceController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const evidenceRouter = express.Router();

evidenceRouter.post("/upload", authenticateToken, uploadEvidenceMiddleware, uploadEvidence);
evidenceRouter.get("/", authenticateToken, getEvidence);
evidenceRouter.get("/all", authenticateToken, authorizeRoles("administrator"), getAllEvidence);

export default evidenceRouter;
