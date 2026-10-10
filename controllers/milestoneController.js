import Milestone from "../models/milestoneModel.js";
import Project from "../models/projectModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import User from "../models/userModel.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { emitToProject } from "../utils/socket.js";

const assertCanMutateMilestones = async (req, res, projectId) => {
  if (req.user.role === "administrator") return true;

  if (req.user.role !== "professional") {
    res.status(403).json({
      success: false,
      message: "Only verified construction professionals can create or update milestones.",
    });
    return false;
  }

  const professional = await User.findByPk(req.user.userId);
  if (!professional?.verified) {
    res.status(403).json({
      success: false,
      message: "Your account must be verified by an administrator before updating milestones.",
    });
    return false;
  }

  const assignment = await ProjectAssignment.findOne({
    where: { projectId, professionalId: req.user.userId },
  });
  if (!assignment) {
    res.status(403).json({ success: false, message: "Forbidden: you are not assigned to this project." });
    return false;
  }

  return true;
};

export const createMilestone = async (req, res) => {
  try {
    const { projectId, label, plannedDate, completionRate, status } = req.body;

    if (!projectId || !label) {
      return res.status(400).json({ success: false, message: "Project ID and label are required" });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const allowed = await assertCanMutateMilestones(req, res, projectId);
    if (!allowed) return;

    const milestone = await Milestone.create({
      projectId,
      label,
      plannedDate,
      completionRate,
      status,
    });

    emitToProject(projectId, "milestone:updated", milestone);

    return res.status(201).json({ success: true, milestone });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, plannedDate, completionRate, status } = req.body;

    const milestone = await Milestone.findByPk(id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found" });
    }

    const project = await Project.findByPk(milestone.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const allowed = await assertCanMutateMilestones(req, res, milestone.projectId);
    if (!allowed) return;

    if (label !== undefined) milestone.label = label;
    if (plannedDate !== undefined) milestone.plannedDate = plannedDate;
    if (completionRate !== undefined) milestone.completionRate = completionRate;
    if (status !== undefined) milestone.status = status;

    await milestone.save();

    emitToProject(milestone.projectId, "milestone:updated", milestone);

    return res.status(200).json({ success: true, milestone });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMilestones = async (req, res) => {
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

    const milestones = await Milestone.findAll({ where: { projectId } });

    return res.status(200).json({ success: true, milestones });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMyMilestones = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    const projectIds = [];

    if (role === 'administrator') {
      const projects = await Project.findAll();
      projectIds.push(...projects.map((p) => p.id));
    } else {
      const ownedProjects = await Project.findAll({ where: { ownerId: userId } });
      projectIds.push(...ownedProjects.map((p) => p.id));

      const assignments = await ProjectAssignment.findAll({ where: { professionalId: userId } });
      projectIds.push(...assignments.map((a) => a.projectId));
    }

    const uniqueProjectIds = [...new Set(projectIds)];

    const milestones = await Milestone.findAll({ where: { projectId: uniqueProjectIds } });

    return res.status(200).json({ success: true, milestones });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
