import ProgressReport from "../models/progressReportModel.js";
import Project from "../models/projectModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { emitToProject } from "../utils/socket.js";

export const submitReport = [
  authenticateToken,
  authorizeRoles("professional"),
  async (req, res) => {
    try {
      const { projectId, summary } = req.body;

      if (!projectId || !summary) {
        return res.status(400).json({ success: false, message: "Project ID and summary are required" });
      }

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      const isOwner = project.ownerId === req.user.userId;
      const isAdmin = req.user.role === "administrator";

      if (!isOwner && !isAdmin) {
        const assignment = await ProjectAssignment.findOne({
          where: { projectId, professionalId: req.user.userId },
        });
        if (!assignment) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      }

      const report = await ProgressReport.create({
        projectId,
        professionalId: req.user.userId,
        summary,
      });

      emitToProject(projectId, "report:new", report);

      return res.status(201).json({ success: true, report });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const getProjectReports = async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "administrator";

    if (!isOwner && !isAdmin) {
      const assignment = await ProjectAssignment.findOne({
        where: { projectId, professionalId: req.user.userId },
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    const reports = await ProgressReport.findAll({ where: { projectId } });

    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let whereCondition = {};
    if (role === 'professional') {
      whereCondition = { professionalId: userId };
    } else if (role === 'property_owner') {
      const ownedProjects = await Project.findAll({ where: { ownerId: userId } });
      const projectIds = ownedProjects.map((p) => p.id);
      whereCondition = { projectId: projectIds };
    }

    const reports = await ProgressReport.findAll({ where: whereCondition });

    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllReports = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const reports = await ProgressReport.findAll({
        include: [
          { model: Project, as: 'project', attributes: ['id', 'title'] },
          { model: User, as: 'professional', attributes: ['id', 'fullName'] },
        ],
      });

      return res.status(200).json({ success: true, reports });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];
