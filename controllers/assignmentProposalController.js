import ProjectAssignment from "../models/projectAssignmentModel.js";
import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { emitToProject, emitToUser } from "../utils/socket.js";

export const proposeProfessional = [
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

      const professional = await User.findByPk(professionalId);
      if (!professional || professional.role !== "professional") {
        return res.status(404).json({ success: false, message: "Professional not found" });
      }

      if (!professional.verified) {
        return res.status(400).json({ success: false, message: "Professional is not verified" });
      }

      const existing = await ProjectAssignment.findOne({
        where: { projectId, professionalId },
      });

      if (existing) {
        existing.status = "proposed";
        await existing.save();
        return res.status(200).json({ success: true, assignment: existing });
      }

      const assignment = await ProjectAssignment.create({
        projectId,
        professionalId,
        status: "proposed",
      });

      const notification = await Notification.create({
        userId: project.ownerId,
        message: `An engineer has been proposed for your project "${project.title}". Please review and accept or reject.`,
        status: "unread",
      });
      emitToUser(project.ownerId, "notification:new", notification);

      emitToProject(projectId, "project:updated", assignment);

      return res.status(201).json({ success: true, assignment });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const acceptAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await ProjectAssignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const project = await Project.findByPk(assignment.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.ownerId !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    assignment.status = "accepted";
    await assignment.save();

    const professional = await User.findByPk(assignment.professionalId);

    const ownerNotification = await Notification.create({
      userId: project.ownerId,
      message: `You accepted ${professional?.fullName} for project "${project.title}".`,
      status: "unread",
    });
    emitToUser(project.ownerId, "notification:new", ownerNotification);

    const professionalNotification = await Notification.create({
      userId: professional?.id,
      message: `You have been selected for project "${project.title}" by the owner.`,
      status: "unread",
    });
    emitToUser(professional?.id, "notification:new", professionalNotification);

    emitToProject(assignment.projectId, "project:updated", assignment);

    return res.status(200).json({ success: true, assignment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const rejectAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await ProjectAssignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const project = await Project.findByPk(assignment.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.ownerId !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    assignment.status = "rejected";
    await assignment.save();

    const professional = await User.findByPk(assignment.professionalId);

    const ownerNotification = await Notification.create({
      userId: project.ownerId,
      message: `You rejected ${professional?.fullName} for project "${project.title}".`,
      status: "unread",
    });
    emitToUser(project.ownerId, "notification:new", ownerNotification);

    const professionalNotification = await Notification.create({
      userId: professional?.id,
      message: `You were not selected for project "${project.title}".`,
      status: "unread",
    });
    emitToUser(professional?.id, "notification:new", professionalNotification);

    return res.status(200).json({ success: true, assignment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getPendingAssignments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let whereCondition = {};
    if (role === "property_owner") {
      const ownedProjects = await Project.findAll({ where: { ownerId: userId } });
      const projectIds = ownedProjects.map((p) => p.id);
      whereCondition = { projectId: projectIds, status: "proposed" };
    } else if (role === "administrator") {
      whereCondition = { status: "proposed" };
    } else {
      whereCondition = { professionalId: userId, status: "proposed" };
    }

    const assignments = await ProjectAssignment.findAll({
      where: whereCondition,
      include: [
        { model: Project, as: "project", attributes: ["id", "title", "location", "status"] },
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "specialty", "verified"] },
      ],
    });

    return res.status(200).json({ success: true, assignments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
