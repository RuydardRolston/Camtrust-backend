import express from "express";
import {
  submitReport,
  getProjectReports,
  getMyReports,
  getAllReports,
} from "../controllers/reportController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const reportRouter = express.Router();

reportRouter.post("/submit", authenticateToken, submitReport);
reportRouter.get("/", authenticateToken, getProjectReports);
reportRouter.get("/my", authenticateToken, getMyReports);
reportRouter.get("/all", authenticateToken, authorizeRoles("administrator"), getAllReports);

export default reportRouter;
