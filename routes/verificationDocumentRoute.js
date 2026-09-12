import express from "express";
import {
  uploadVerificationDocumentMiddleware,
  uploadVerificationDocument,
  getVerificationDocuments,
} from "../controllers/verificationDocumentController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const verificationDocumentRouter = express.Router();

verificationDocumentRouter.post("/:verificationId/documents", authenticateToken, uploadVerificationDocumentMiddleware, uploadVerificationDocument);
verificationDocumentRouter.get("/:verificationId/documents", authenticateToken, getVerificationDocuments);

export default verificationDocumentRouter;
