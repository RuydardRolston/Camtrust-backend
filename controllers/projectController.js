import Project from "../models/projectModel.js";
import Milestone from "../models/milestoneModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import SiteEvidence from "../models/siteEvidenceModel.js";
import ProgressReport from "../models/progressReportModel.js";
import Document from "../models/documentModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { getIO, emitToUser } from "../utils/socket.js";
import multer from "multer";

// Multer storage for feasibility documents uploaded at project creation
const feasibilityStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
export const feasibilityUpload = multer({
  storage: feasibilityStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
}).array("feasibilityDocs", 10);

export const createProject = async (req, res) => {
  try {
    if (req.user.role !== "property_owner") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only Project Owners are authorized to create construction projects. Engineers submit proposals.",
      });
    }

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

    // Automatically create standard baseline milestones for construction monitoring
    const standardMilestones = [
      { label: "Site Preparation & Excavation", completionRate: 0, status: "Pending" },
      { label: "Foundation & Footing Casting", completionRate: 0, status: "Pending" },
      { label: "Substructure & Concrete Columns", completionRate: 0, status: "Pending" },
      { label: "Superstructure, Beams & Slabs", completionRate: 0, status: "Pending" },
      { label: "Roofing & External Enclosure", completionRate: 0, status: "Pending" },
      { label: "Finishes, MEP & Final Inspection", completionRate: 0, status: "Pending" },
    ];

    for (const ms of standardMilestones) {
      await Milestone.create({
        projectId: project.id,
        label: ms.label,
        completionRate: ms.completionRate,
        status: ms.status,
      });
    }

    // Save any feasibility documents uploaded with the project
    const uploadedFiles = req.files || [];
    const savedDocs = [];
    for (const file of uploadedFiles) {
      const fileCategory = req.body[`docCategory_${file.fieldname}_${file.originalname}`] || "Feasibility";
      const doc = await Document.create({
        projectId: project.id,
        uploadedByUserId: req.user.userId,
        fileName: file.originalname,
        fileUrl: "/uploads/" + file.filename,
        category: fileCategory,
      });
      savedDocs.push(doc);
    }

    const admins = await User.findAll({ where: { role: "administrator" } });
    const docCount = uploadedFiles.length;
    for (const admin of admins) {
      const notification = await Notification.create({
        userId: admin.id,
        message: `New construction project "${title}" submitted by Project Owner for feasibility review.${docCount > 0 ? ` (${docCount} feasibility document(s) attached)` : ""}`,
        status: "unread",
      });
      emitToUser(admin.id, "notification:new", {
        ...notification.toJSON(),
        targetTab: "projects",
        projectId: project.id,
      });
    }

    return res.status(201).json({ success: true, project, feasibilityDocs: savedDocs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMyProjects = async (req, res) => {
  try {
    let projects;
    const isAdmin = req.user.role === 'administrator' || req.user.role === 'admin';

    if (isAdmin) {
      projects = await Project.findAll({
        include: [
          { model: Milestone, as: 'milestones' },
          { model: User, as: 'owner', attributes: ['id', 'fullName', 'email', 'phone'] },
          {
            model: ProjectAssignment,
            as: 'assignments',
            include: [
              { model: User, as: 'professional', attributes: ['id', 'fullName', 'email', 'phone', 'specialty', 'verified'] }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else if (req.user.role === 'professional') {
      const assignments = await ProjectAssignment.findAll({
        where: { professionalId: req.user.userId },
        include: [
          {
            model: Project,
            as: 'project',
            include: [
              { model: User, as: 'owner', attributes: ['id', 'fullName', 'email', 'phone'] },
              { model: Milestone, as: 'milestones' },
            ]
          }
        ]
      });
      projects = assignments.map(a => a.project).filter(Boolean);
    } else {
      projects = await Project.findAll({
        where: { ownerId: req.user.userId },
        include: [
          { model: Milestone, as: 'milestones' },
          {
            model: ProjectAssignment,
            as: 'assignments',
            include: [
              { model: User, as: 'professional', attributes: ['id', 'fullName', 'email', 'phone', 'specialty', 'verified'] }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    return res.status(200).json({ success: true, projects });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [
        { model: User, as: "owner", attributes: ["id", "fullName", "email", "phone"] },
        {
          model: ProjectAssignment,
          as: "assignments",
          include: [
            { model: User, as: "professional", attributes: ["id", "fullName", "email", "phone", "specialty", "verified", "employeeId"] }
          ]
        },
        {
          model: Milestone,
          as: "milestones",
        },
        {
          model: ProgressReport,
          as: "reports",
          include: [
            { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
            { model: Milestone, as: "milestone" }
          ]
        },
        {
          model: SiteEvidence,
          as: "evidence",
          include: [
            { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified"] },
            { model: Milestone, as: "milestone" }
          ]
        },
        {
          model: Document,
          as: "documents"
        }
      ]
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "administrator";
    const isAssigned = (project.assignments || []).some(a => a.professionalId === req.user.userId);

    if (!isOwner && !isAdmin && !isAssigned) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not have access to this project." });
    }

    return res.status(200).json({
      success: true,
      project,
      milestones: project.milestones,
      reports: project.reports,
      evidence: project.evidence,
      documents: project.documents
    });
  } catch (error) {
    console.error("Failed to get project by id:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [
        { model: User, as: "owner", attributes: ["id", "fullName", "email"] },
        { model: Milestone, as: "milestones" },
        {
          model: ProjectAssignment,
          as: "assignments",
          include: [{ model: User, as: "professional", attributes: ["id", "fullName", "email", "verified"] }]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
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

    if (status === "Approved" || status === "Rejected") {
      const notification = await Notification.create({
        userId: project.ownerId,
        message: `Your project "${project.title}" has been ${status.toUpperCase()}${rejectionReason ? `: ${rejectionReason}` : ' by the administrator.'}`,
        status: "unread",
      });
      emitToUser(project.ownerId, "notification:new", notification);
      getIO().to(`user:${project.ownerId}`).emit("notification:new", notification);
    }

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

    if (project.ownerId !== req.user.userId && req.user.role !== "administrator") {
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
