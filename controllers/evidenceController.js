import multer from "multer";
import SiteEvidence from "../models/siteEvidenceModel.js";
import Milestone from "../models/milestoneModel.js";
import Project from "../models/projectModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import User from "../models/userModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { emitToProject } from "../utils/socket.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const uploadEvidenceMiddleware = upload.single("photo");

export const uploadEvidence = async (req, res) => {
  try {
    const { milestoneId, gpsLatitude, gpsLongitude, gpsAvailable } = req.body;

    if (!milestoneId) {
      return res.status(400).json({ success: false, message: "Milestone ID is required" });
    }

    const milestone = await Milestone.findByPk(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found" });
    }

    const project = await Project.findByPk(milestone.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "administrator";

    if (!isOwner && !isAdmin) {
      const assignment = await ProjectAssignment.findOne({
        where: { projectId: milestone.projectId, professionalId: req.user.userId },
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Photo file is required" });
    }

    const photoUrl = "/uploads/" + req.file.filename;

    const evidence = await SiteEvidence.create({
      milestoneId,
      professionalId: req.user.userId,
      photoUrl,
      gpsLatitude: gpsLatitude !== undefined ? parseFloat(gpsLatitude) : null,
      gpsLongitude: gpsLongitude !== undefined ? parseFloat(gpsLongitude) : null,
      gpsAvailable: gpsAvailable === "true" || gpsAvailable === true,
    });

    emitToProject(milestone.projectId, "evidence:new", evidence);

    return res.status(201).json({ success: true, evidence });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllEvidence = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const evidenceList = await SiteEvidence.findAll({
        include: [
          { model: Milestone, as: "milestone", attributes: ["id", "label", "projectId"] },
          { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified"] },
        ],
      });

      return res.status(200).json({ success: true, evidence: evidenceList });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const getEvidence = async (req, res) => {
  try {
    const { milestoneId } = req.query;

    if (!milestoneId) {
      return res.status(400).json({ success: false, message: "Milestone ID is required" });
    }

    const milestone = await Milestone.findByPk(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found" });
    }

    const project = await Project.findByPk(milestone.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "administrator";

    if (!isOwner && !isAdmin) {
      const assignment = await ProjectAssignment.findOne({
        where: { projectId: milestone.projectId, professionalId: req.user.userId },
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    const evidenceList = await SiteEvidence.findAll({ where: { milestoneId } });

    return res.status(200).json({ success: true, evidence: evidenceList });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
