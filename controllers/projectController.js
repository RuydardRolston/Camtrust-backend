import Project from "../models/projectModel.js";
import Milestone from "../models/milestoneModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

export const createProject = async (req, res) => {
  try {
    const { title, location, description, budget, startDate, estimatedDuration, estimatedEndDate } = req.body;

    if (!title || !location) {
      return res.status(400).json({ success: false, message: "Title and location are required" });
    }

    const project = await Project.create({
      title,
      location,
      description,
      budget,
      startDate,
      estimatedDuration,
      estimatedEndDate,
      ownerId: req.user.userId,
      status: "Under Review",
    });

    return res.status(201).json({ success: true, project });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({ where: { ownerId: req.user.userId } });
    return res.status(200).json({ success: true, projects });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "administrator";

    if (!isOwner && !isAdmin) {
      const assignment = await ProjectAssignment.findOne({
        where: { projectId: id, professionalId: req.user.userId },
      });
      const isProfessional = req.user.role === "professional";

      if (!assignment && !isProfessional) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    const milestones = await Milestone.findAll({ where: { projectId: id } });

    return res.status(200).json({ success: true, project, milestones });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.findAll();
    return res.status(200).json({ success: true, projects });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const allowedStatuses = ["Under Review", "Approved", "Rejected", "In Progress", "Completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    project.status = status;
    if (rejectionReason !== undefined) {
      project.rejectionReason = rejectionReason;
    }

    await project.save();

    return res.status(200).json({ success: true, project });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, location, description, budget, startDate, estimatedDuration, estimatedEndDate } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.ownerId !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (title !== undefined) project.title = title;
    if (location !== undefined) project.location = location;
    if (description !== undefined) project.description = description;
    if (budget !== undefined) project.budget = budget;
    if (startDate !== undefined) project.startDate = startDate;
    if (estimatedDuration !== undefined) project.estimatedDuration = estimatedDuration;
    if (estimatedEndDate !== undefined) project.estimatedEndDate = estimatedEndDate;

    await project.save();

    return res.status(200).json({ success: true, project });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "administrator";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await project.destroy();

    return res.status(200).json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
