import express from "express";
import {
  submitReport,
  getProjectReports,
  getReportById,
  getMyReports,
  getAllReports,
  sendReportToOwner,
} from "../controllers/reportController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const reportRouter = express.Router();

reportRouter.post("/submit", authenticateToken, submitReport);
reportRouter.post("/", authenticateToken, submitReport);
reportRouter.get("/", authenticateToken, getProjectReports);
reportRouter.get("/project/:projectId", authenticateToken, getProjectReports);
reportRouter.get("/my", authenticateToken, getMyReports);
reportRouter.get("/all", authenticateToken, authorizeRoles("administrator"), getAllReports);
reportRouter.get("/:id", authenticateToken, getReportById);
reportRouter.post("/:id/send-to-owner", authenticateToken, sendReportToOwner);

export default reportRouter;