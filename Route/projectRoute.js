import express from "express";
import {
  createProject,
  getMyProjects,
  getProjectById,
  getAllProjects,
  updateProjectStatus,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const projectRouter = express.Router();

projectRouter.post("/create", authenticateToken, createProject);
projectRouter.get("/my", authenticateToken, getMyProjects);
projectRouter.get("/all", authenticateToken, authorizeRoles("administrator"), getAllProjects);
projectRouter.get("/:id", authenticateToken, getProjectById);
projectRouter.put("/:id", authenticateToken, updateProject);
projectRouter.put("/:id/status", authenticateToken, authorizeRoles("administrator"), updateProjectStatus);
projectRouter.delete("/:id", authenticateToken, deleteProject);

export default projectRouter;
