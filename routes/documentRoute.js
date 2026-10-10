import express from "express";
import {
  uploadDocumentMiddleware,
  uploadDocument,
  getProjectDocuments,
  getMySentDocuments,
  getMyReceivedDocuments,
  getAllDocuments,
  deleteDocument,
} from "../controllers/documentController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const documentRouter = express.Router();

documentRouter.post("/upload", authenticateToken, uploadDocumentMiddleware, uploadDocument);
documentRouter.get("/", authenticateToken, getProjectDocuments);
documentRouter.get("/my-sent", authenticateToken, getMySentDocuments);
documentRouter.get("/my-received", authenticateToken, getMyReceivedDocuments);
documentRouter.get("/all", authenticateToken, authorizeRoles("administrator"), getAllDocuments);
documentRouter.delete("/:id", authenticateToken, deleteDocument);

export default documentRouter;
