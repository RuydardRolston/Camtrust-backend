import ProjectAssignment from "../models/projectAssignmentModel.js";
import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { emitToProject } from "../utils/socket.js";

export const assignProfessional = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const { projectId, professionalId } = req.body;

      if (!projectId || !professionalId) {
        return res.status(400).json({ success: false, message: "Project ID and professional ID are required" });
      }

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      if (project.status !== "Approved") {
        return res.status(400).json({ success: false, message: "Project is not approved" });
      }

      const professional = await User.findByPk(professionalId);
      if (!professional || professional.role !== "professional") {
        return res.status(404).json({ success: false, message: "Professional not found" });
      }

      if (!professional.verified) {
        return res.status(400).json({ success: false, message: "Professional is not verified" });
      }

      const assignment = await ProjectAssignment.create({
        projectId,
        professionalId,
      });

      emitToProject(projectId, "project:updated", assignment);

      return res.status(201).json({ success: true, assignment });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const getProjectAssignments = async (req, res) => {
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

    const assignments = await ProjectAssignment.findAll({
      where: { projectId },
      include: [
        { model: User, as: "professional", attributes: ["id", "fullName", "email"] },
      ],
    });

    return res.status(200).json({ success: true, assignments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMyAssignments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let assignments;
    if (role === 'professional') {
      assignments = await ProjectAssignment.findAll({
        where: { professionalId: userId },
        include: [
          { model: Project, as: 'project', attributes: ['id', 'title', 'location', 'status', 'budget', 'startDate'] },
        ],
      });
    } else if (role === 'property_owner') {
      const ownedProjects = await Project.findAll({ where: { ownerId: userId } });
      const projectIds = ownedProjects.map((p) => p.id);
      assignments = await ProjectAssignment.findAll({
        where: { projectId: projectIds },
        include: [
          { model: Project, as: 'project', attributes: ['id', 'title', 'location', 'status', 'budget', 'startDate'] },
          { model: User, as: 'professional', attributes: ['id', 'fullName', 'email'] },
        ],
      });
    } else {
      assignments = await ProjectAssignment.findAll({
        include: [
          { model: Project, as: 'project', attributes: ['id', 'title', 'location', 'status', 'budget', 'startDate'] },
          { model: User, as: 'professional', attributes: ['id', 'fullName', 'email'] },
        ],
      });
    }

    return res.status(200).json({ success: true, assignments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
