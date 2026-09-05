import ProjectAssignment from "../models/projectAssignmentModel.js";
import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { emitToProject, emitToUser } from "../utils/socket.js";

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

      if (project.status === "Rejected" || project.status === "Under Review") {
        return res.status(400).json({ success: false, message: "Project must be approved before assigning an engineer." });
      }

      const professional = await User.findByPk(professionalId);
      if (!professional || professional.role !== "professional") {
        return res.status(404).json({ success: false, message: "Construction professional not found" });
      }

      if (!professional.verified) {
        return res.status(400).json({
          success: false,
          message: "Only verified Construction Professionals can be assigned to projects.",
        });
      }

      let [assignment, created] = await ProjectAssignment.findOrCreate({
        where: { projectId, professionalId },
        defaults: {
          projectId,
          professionalId,
          status: "accepted",
          assignedAt: new Date(),
        },
      });

      if (!created) {
        assignment.status = "accepted";
        assignment.assignedAt = new Date();
        await assignment.save();
      }

      // If project was "Approved", set to "In Progress"
      if (project.status === "Approved") {
        project.status = "In Progress";
        await project.save();
      }

      // Notify Engineer
      const engNotification = await Notification.create({
        userId: professionalId,
        message: `You have been assigned as lead engineer for project "${project.title}" located at ${project.location}.`,
        status: "unread",
      });
      emitToUser(professionalId, "notification:new", engNotification);

      // Notify Project Owner
      const ownerNotification = await Notification.create({
        userId: project.ownerId,
        message: `Verified Engineer ${professional.fullName} has been assigned to supervise your project "${project.title}".`,
        status: "unread",
      });
      emitToUser(project.ownerId, "notification:new", ownerNotification);

      emitToProject(projectId, "project:updated", assignment);

      return res.status(201).json({ success: true, assignment, project });
    } catch (error) {
      console.error("Failed to assign professional:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const getVerifiedEngineers = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const engineers = await User.findAll({
        where: {
          role: "professional",
          verified: true,
          status: "active",
        },
        attributes: ["id", "fullName", "email", "phone", "specialty", "verified", "employeeId"],
      });

      return res.status(200).json({ success: true, engineers });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const getProjectAssignments = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.query.projectId;

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
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "phone", "specialty", "verified"] },
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
          {
            model: Project,
            as: 'project',
            include: [{ model: User, as: 'owner', attributes: ['id', 'fullName', 'email', 'phone'] }],
          },
        ],
      });
    } else if (role === 'property_owner') {
      const ownedProjects = await Project.findAll({ where: { ownerId: userId } });
      const projectIds = ownedProjects.map((p) => p.id);
      assignments = await ProjectAssignment.findAll({
        where: { projectId: projectIds },
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'professional', attributes: ['id', 'fullName', 'email', 'phone', 'specialty', 'verified'] },
        ],
      });
    } else {
      assignments = await ProjectAssignment.findAll({
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'professional', attributes: ['id', 'fullName', 'email', 'phone', 'specialty', 'verified'] },
        ],
      });
    }

    return res.status(200).json({ success: true, assignments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
