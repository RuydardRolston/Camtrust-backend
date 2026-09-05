import express from "express";
import { askAssistant } from "../controllers/aiController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const aiRouter = express.Router();

aiRouter.post("/ask", authenticateToken, askAssistant);
aiRouter.post("/chat", authenticateToken, askAssistant);

export default aiRouter;
