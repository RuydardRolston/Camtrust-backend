import express from "express";
import {
  requestVerification,
  getMyVerificationStatus,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  requestNewDocuments,
} from "../controllers/verificationController.js";

const verificationRouter = express.Router();

verificationRouter.post("/request", requestVerification);
verificationRouter.get("/my-status", getMyVerificationStatus);
verificationRouter.get("/pending", getPendingVerifications);
verificationRouter.put("/:id/approve", approveVerification);
verificationRouter.post("/:id/approve", approveVerification);
verificationRouter.put("/:id/reject", rejectVerification);
verificationRouter.post("/:id/reject", rejectVerification);
verificationRouter.put("/:id/request-docs", requestNewDocuments);
verificationRouter.post("/:id/request-docs", requestNewDocuments);

export default verificationRouter;
