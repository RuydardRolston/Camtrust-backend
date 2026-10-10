import multer from "multer";
import SiteEvidence from "../models/siteEvidenceModel.js";
import Milestone from "../models/milestoneModel.js";
import Project from "../models/projectModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { emitToProject, emitToUser } from "../utils/socket.js";
import {
  isValidCoordinate,
  checkProjectGeofence,
  checkTeleportation,
  detectMockSignatures
} from "../utils/geoSecurity.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_"));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const uploadEvidenceMiddleware = upload.single("photo");

export const uploadEvidence = async (req, res) => {
  try {
    const {
      milestoneId,
      projectId: incomingProjectId,
      gpsLatitude,
      gpsLongitude,
      gpsAccuracy,
      gpsAvailable,
      isMock,
      description,
      capturedAt,
      deviceInfo
    } = req.body;

    if (!milestoneId) {
      return res.status(400).json({ success: false, message: "Milestone ID is required" });
    }

    const milestone = await Milestone.findByPk(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found" });
    }

    const projectId = milestone.projectId || incomingProjectId;
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (req.user.role !== "professional") {
      return res.status(403).json({
        success: false,
        message: "Only verified construction professionals can submit site evidence.",
      });
    }

    const professional = await User.findByPk(req.user.userId);
    if (!professional?.verified) {
      return res.status(403).json({
        success: false,
        message: "Your account must be verified by an administrator before submitting site evidence.",
      });
    }

    const assignment = await ProjectAssignment.findOne({
      where: { projectId, professionalId: req.user.userId },
    });
    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You are not assigned to this project.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Photo file is required" });
    }

    const photoUrl = "/uploads/" + req.file.filename;
    const lat = gpsLatitude !== undefined && gpsLatitude !== null && gpsLatitude !== "" ? parseFloat(gpsLatitude) : null;
    const lng = gpsLongitude !== undefined && gpsLongitude !== null && gpsLongitude !== "" ? parseFloat(gpsLongitude) : null;
    const accuracy = gpsAccuracy !== undefined && gpsAccuracy !== null && gpsAccuracy !== "" ? parseFloat(gpsAccuracy) : null;
    const hasValidCoords = lat !== null && lng !== null && isValidCoordinate(lat, lng);
    const hasGps = (gpsAvailable === "true" || gpsAvailable === true || hasValidCoords) && hasValidCoords;

    // --- Anti-Mock GPS & Geofencing Analysis ---
    let isMockGps = false;
    let mockSuspicionReasons = [];
    let geofenceDistanceMeters = null;

    if (hasGps) {
      // 1. Signature check (synthetic accuracy / device mock flag)
      const mockSignature = detectMockSignatures({ accuracy, isMockFlag: isMock });
      if (mockSignature.isMockSuspicious) {
        isMockGps = true;
        mockSuspicionReasons.push(mockSignature.reason);
      }

      // 2. Teleportation / velocity check against previous evidence
      const lastEvidence = await SiteEvidence.findOne({
        where: { professionalId: req.user.userId, gpsAvailable: true },
        order: [["capturedAt", "DESC"]],
      });
      const teleportationCheck = checkTeleportation(lastEvidence, lat, lng, capturedAt ? new Date(capturedAt) : new Date());
      if (teleportationCheck.isTeleporting) {
        isMockGps = true;
        mockSuspicionReasons.push(teleportationCheck.reason);
      }

      // 3. Project Geofence validation
      const geofenceCheck = checkProjectGeofence(project, lat, lng);
      if (geofenceCheck.checked) {
        geofenceDistanceMeters = geofenceCheck.distanceMeters;
        if (!geofenceCheck.withinGeofence) {
          isMockGps = true;
          mockSuspicionReasons.push(
            `Location is ${geofenceCheck.distanceMeters}m from registered site (allowed geofence perimeter: ${geofenceCheck.maxRadiusMeters}m).`
          );
        }
      }
    }

    const mockReasonSummary = mockSuspicionReasons.length > 0 ? mockSuspicionReasons.join(" | ") : null;

    const evidence = await SiteEvidence.create({
      projectId,
      milestoneId: parseInt(milestoneId),
      professionalId: req.user.userId,
      photoUrl,
      description: description || "Site evidence photo",
      deviceInfo: deviceInfo || null,
      capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
      gpsLatitude: lat,
      gpsLongitude: lng,
      gpsAvailable: hasGps,
      gpsAccuracy: accuracy,
      isMockGps,
      mockSuspicionReason: mockReasonSummary,
      geofenceDistanceMeters,
    });

    const populatedEvidence = await SiteEvidence.findByPk(evidence.id, {
      include: [
        { model: Milestone, as: "milestone", attributes: ["id", "label", "projectId"] },
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
        { model: Project, as: "project", attributes: ["id", "title", "location", "latitude", "longitude", "geofenceRadiusMeters"] },
      ],
    });

    // Notify Project Owner
    if (project.ownerId !== req.user.userId) {
      const engineer = await User.findByPk(req.user.userId);
      const alertPrefix = isMockGps ? "⚠️ [Location Warning] " : "";
      const alertSuffix = isMockGps
        ? ` Note: Geofence or Mock GPS flag detected (${mockReasonSummary}).`
        : " GPS & timestamp verified on site.";

      const notification = await Notification.create({
        userId: project.ownerId,
        message: `${alertPrefix}New site evidence photo recorded for "${project.title}" by ${engineer?.fullName || 'Engineer'}.${alertSuffix}`,
        status: "unread",
      });
      emitToUser(project.ownerId, "notification:new", notification);
    }

    emitToProject(projectId, "evidence:new", populatedEvidence);

    return res.status(201).json({ success: true, evidence: populatedEvidence });
  } catch (error) {
    console.error("Failed to upload evidence:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProjectEvidence = async (req, res) => {
  try {
    const { projectId } = req.params;

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

    const evidenceList = await SiteEvidence.findAll({
      where: { projectId },
      include: [
        { model: Milestone, as: "milestone", attributes: ["id", "label", "completionRate", "status"] },
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
      ],
      order: [["capturedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, evidence: evidenceList });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllEvidence = [
  authenticateToken,
  async (req, res) => {
    try {
      const include = [
        {
          model: Milestone,
          as: "milestone",
          attributes: ["id", "label", "projectId"],
          include: [{ model: Project, as: "project", attributes: ["id", "title", "location"] }]
        },
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
        { model: Project, as: "project", attributes: ["id", "title", "location"] },
      ];

      let where = {};
      if (req.user.role === "property_owner") {
        const owned = await Project.findAll({ where: { ownerId: req.user.userId }, attributes: ["id"] });
        where = { projectId: owned.map((p) => p.id) };
      } else if (req.user.role === "professional") {
        const assignments = await ProjectAssignment.findAll({
          where: { professionalId: req.user.userId },
          attributes: ["projectId"],
        });
        where = { projectId: assignments.map((a) => a.projectId) };
      }

      const evidenceList = await SiteEvidence.findAll({
        where,
        include,
        order: [["capturedAt", "DESC"]],
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

    const evidenceList = await SiteEvidence.findAll({
      where: { milestoneId },
      include: [
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
      ],
      order: [["capturedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, evidence: evidenceList });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
