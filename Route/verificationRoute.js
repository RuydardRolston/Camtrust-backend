import express from "express";
import {
  requestVerification,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
} from "../controllers/verificationController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const verificationRouter = express.Router();

verificationRouter.post("/request", requestVerification);
verificationRouter.get("/pending", getPendingVerifications);
verificationRouter.put("/:id/approve", approveVerification);
verificationRouter.put("/:id/reject", rejectVerification);

export default verificationRouter;
