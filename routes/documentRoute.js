import express from "express";
import {
  uploadDocumentMiddleware,
  uploadDocument,
  getProjectDocuments,
  getAllDocuments,
  deleteDocument,
} from "../controllers/documentController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const documentRouter = express.Router();

documentRouter.post("/upload", authenticateToken, uploadDocumentMiddleware, uploadDocument);
documentRouter.get("/", authenticateToken, getProjectDocuments);
documentRouter.get("/all", authenticateToken, authorizeRoles("administrator"), getAllDocuments);
documentRouter.delete("/:id", authenticateToken, deleteDocument);

export default documentRouter;
