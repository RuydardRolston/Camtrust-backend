import express from "express";
import {
  uploadDocumentMiddleware,
  uploadDocument,
  getProjectDocuments,
  deleteDocument,
} from "../controllers/documentController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const documentRouter = express.Router();

documentRouter.post("/upload", authenticateToken, uploadDocumentMiddleware, uploadDocument);
documentRouter.get("/", authenticateToken, getProjectDocuments);
documentRouter.delete("/:id", authenticateToken, deleteDocument);

export default documentRouter;
