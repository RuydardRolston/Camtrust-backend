import multer from "multer";
import { Op } from "sequelize";
import Document from "../models/documentModel.js";
import Project from "../models/projectModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { emitToProject, emitToUser } from "../utils/socket.js";
import fs from "fs";
import path from "path";

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

export const uploadDocumentMiddleware = upload.single("document");

export const uploadDocument = async (req, res) => {
  try {
    const { projectId, category, targetRecipient, notes } = req.body;

    if (!projectId || !category) {
      return res.status(400).json({ success: false, message: "Project ID and category are required" });
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

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Document file is required" });
    }

    const fileUrl = "/uploads/" + req.file.filename;

    // Resolve target recipient
    let resolvedTarget = targetRecipient || "all";
    let recipientUserId = null;
    let recipientName = "All Project Stakeholders";

    if (resolvedTarget === "property_owner") {
      recipientUserId = project.ownerId;
      const owner = await User.findByPk(project.ownerId);
      recipientName = owner ? `${owner.fullName} (Project Owner)` : "Project Owner";
    } else if (resolvedTarget === "engineer") {
      const assignment = await ProjectAssignment.findOne({
        where: { projectId, status: "accepted" },
        include: [{ model: User, as: "professional" }],
      }) || await ProjectAssignment.findOne({
        where: { projectId },
        include: [{ model: User, as: "professional" }],
      });
      if (assignment && assignment.professional) {
        recipientUserId = assignment.professionalId;
        recipientName = `${assignment.professional.fullName} (Assigned Engineer)`;
      } else {
        recipientName = "Assigned Civil Engineer";
      }
    } else if (resolvedTarget === "administrator") {
      recipientUserId = null;
      recipientName = "Platform Administrator";
    } else if (resolvedTarget === "both") {
      if (isOwner) {
        // Owner sending to both assigned engineer & admin
        const assignment = await ProjectAssignment.findOne({
          where: { projectId, status: "accepted" },
          include: [{ model: User, as: "professional" }],
        }) || await ProjectAssignment.findOne({
          where: { projectId },
          include: [{ model: User, as: "professional" }],
        });
        recipientUserId = assignment ? assignment.professionalId : null;
        recipientName = assignment?.professional
          ? `${assignment.professional.fullName} (Engineer) & Administrator`
          : "Assigned Engineer & Administrator";
      } else if (isAdmin) {
        // Admin sending to both owner and engineer
        recipientUserId = project.ownerId;
        recipientName = "Project Owner & Assigned Engineer";
      } else {
        // Engineer sending to both owner and admin
        recipientUserId = project.ownerId;
        recipientName = "Project Owner & Administrator";
      }
    } else if (resolvedTarget === "all") {
      recipientName = "All Project Stakeholders";
    }

    const document = await Document.create({
      projectId,
      fileName: req.file.originalname,
      fileUrl,
      category,
      targetRecipient: resolvedTarget,
      recipientUserId,
      recipientName,
      notes: notes || null,
      status: "sent",
      uploadedByUserId: req.user.userId,
    });

    const uploader = await User.findByPk(req.user.userId, { attributes: ["id", "fullName", "role", "email"] });
    const fullDoc = {
      ...document.toJSON(),
      uploadedBy: uploader,
      project: { id: project.id, title: project.title, location: project.location }
    };

    emitToProject(projectId, "document:new", fullDoc);

    // Multi-directional targeted notifications
    if (resolvedTarget === "property_owner") {
      try {
        const notification = await Notification.create({
          userId: project.ownerId,
          message: `${uploader?.fullName || "Engineer"} sent document "${req.file.originalname}" directly to you for project "${project.title}"`,
          status: "unread",
        });
        emitToUser(project.ownerId, "notification:new", {
          ...notification.toJSON(),
          targetTab: "documents",
          projectId: parseInt(projectId, 10),
        });
      } catch (nErr) {
        console.error("Failed to notify project owner:", nErr);
      }
    } else if (resolvedTarget === "engineer") {
      try {
        const assignments = await ProjectAssignment.findAll({ where: { projectId } });
        for (const a of assignments) {
          const notification = await Notification.create({
            userId: a.professionalId,
            message: `${uploader?.fullName || "Project Owner"} sent document "${req.file.originalname}" directly to you for project "${project.title}"`,
            status: "unread",
          });
          emitToUser(a.professionalId, "notification:new", {
            ...notification.toJSON(),
            targetTab: "documents",
            projectId: parseInt(projectId, 10),
          });
        }
      } catch (nErr) {
        console.error("Failed to notify assigned engineers:", nErr);
      }
    } else if (resolvedTarget === "administrator") {
      try {
        const admins = await User.findAll({ where: { role: "administrator" } });
        for (const admin of admins) {
          const notification = await Notification.create({
            userId: admin.id,
            message: `${uploader?.fullName || "User"} sent document "${req.file.originalname}" to Administrator for project "${project.title}"`,
            status: "unread",
          });
          emitToUser(admin.id, "notification:new", {
            ...notification.toJSON(),
            targetTab: "documents",
            projectId: parseInt(projectId, 10),
          });
        }
      } catch (nErr) {
        console.error("Failed to notify administrators:", nErr);
      }
    } else if (resolvedTarget === "both") {
      // Notify based on sender
      if (isOwner) {
        // Notify engineer & admins
        try {
          const assignments = await ProjectAssignment.findAll({ where: { projectId } });
          for (const a of assignments) {
            const notification = await Notification.create({
              userId: a.professionalId,
              message: `${uploader?.fullName || "Project Owner"} sent document "${req.file.originalname}" to you and Administrator for project "${project.title}"`,
              status: "unread",
            });
            emitToUser(a.professionalId, "notification:new", {
              ...notification.toJSON(),
              targetTab: "documents",
              projectId: parseInt(projectId, 10),
            });
          }
          const admins = await User.findAll({ where: { role: "administrator" } });
          for (const admin of admins) {
            const notification = await Notification.create({
              userId: admin.id,
              message: `${uploader?.fullName || "Project Owner"} sent document "${req.file.originalname}" to Engineer & Administrator for project "${project.title}"`,
              status: "unread",
            });
            emitToUser(admin.id, "notification:new", {
              ...notification.toJSON(),
              targetTab: "documents",
              projectId: parseInt(projectId, 10),
            });
          }
        } catch (nErr) {
          console.error("Failed to notify both targets:", nErr);
        }
      } else {
        // Engineer sending to owner & admins
        try {
          const notification = await Notification.create({
            userId: project.ownerId,
            message: `${uploader?.fullName || "Engineer"} sent document "${req.file.originalname}" to you and the Administrator for project "${project.title}"`,
            status: "unread",
          });
          emitToUser(project.ownerId, "notification:new", {
            ...notification.toJSON(),
            targetTab: "documents",
            projectId: parseInt(projectId, 10),
          });
        } catch (nErr) {
          console.error("Failed to notify owner:", nErr);
        }
        try {
          const admins = await User.findAll({ where: { role: "administrator" } });
          for (const admin of admins) {
            const notification = await Notification.create({
              userId: admin.id,
              message: `${uploader?.fullName || "User"} sent document "${req.file.originalname}" for project "${project.title}"`,
              status: "unread",
            });
            emitToUser(admin.id, "notification:new", {
              ...notification.toJSON(),
              targetTab: "documents",
              projectId: parseInt(projectId, 10),
            });
          }
        } catch (nErr) {
          console.error("Failed to notify admins:", nErr);
        }
      }
    } else {
      // General upload: notify counterparties
      if (isOwner) {
        const assignments = await ProjectAssignment.findAll({ where: { projectId } });
        for (const a of assignments) {
          try {
            const notification = await Notification.create({
              userId: a.professionalId,
              message: `Owner uploaded new document "${req.file.originalname}" to project "${project.title}"`,
              status: "unread",
            });
            emitToUser(a.professionalId, "notification:new", {
              ...notification.toJSON(),
              targetTab: "documents",
              projectId: parseInt(projectId, 10),
            });
          } catch (nErr) {
            console.error("Failed to notify assigned engineer:", nErr);
          }
        }
      } else {
        try {
          const notification = await Notification.create({
            userId: project.ownerId,
            message: `New document "${req.file.originalname}" uploaded to project "${project.title}" by ${uploader?.fullName || "Engineer"}`,
            status: "unread",
          });
          emitToUser(project.ownerId, "notification:new", {
            ...notification.toJSON(),
            targetTab: "documents",
            projectId: parseInt(projectId, 10),
          });
        } catch (nErr) {
          console.error("Failed to notify project owner:", nErr);
        }
      }
    }

    return res.status(201).json({ success: true, document: fullDoc });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProjectDocuments = async (req, res) => {
  try {
    const { projectId, targetRecipient } = req.query;

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

    const whereClause = { projectId };
    if (targetRecipient && targetRecipient !== "all") {
      whereClause.targetRecipient = targetRecipient;
    }

    const documents = await Document.findAll({
      where: whereClause,
      include: [
        { model: User, as: "uploadedBy", attributes: ["id", "fullName", "email", "role", "verified"] },
        { model: User, as: "recipientUser", attributes: ["id", "fullName", "email", "role"] },
        { model: Project, as: "project", attributes: ["id", "title", "location", "ownerId"] },
      ],
      order: [["uploadedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMySentDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { uploadedByUserId: req.user.userId },
      include: [
        { model: Project, as: "project", attributes: ["id", "title", "location", "ownerId"] },
        { model: User, as: "uploadedBy", attributes: ["id", "fullName", "email", "role"] },
        { model: User, as: "recipientUser", attributes: ["id", "fullName", "email", "role"] },
      ],
      order: [["uploadedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error("Failed to load sent documents:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMyReceivedDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // 1. Projects where user is owner
    const ownedProjects = await Project.findAll({ where: { ownerId: userId }, attributes: ["id"] });
    const ownedProjectIds = ownedProjects.map((p) => p.id);

    // 2. Projects where user is assigned engineer
    const assignments = await ProjectAssignment.findAll({ where: { professionalId: userId }, attributes: ["projectId"] });
    const assignedProjectIds = assignments.map((a) => a.projectId);

    let whereClause = {};

    if (userRole === "administrator") {
      whereClause = {
        [Op.or]: [
          { targetRecipient: "administrator" },
          { targetRecipient: "both" },
          { targetRecipient: "all" },
          { recipientUserId: userId },
        ],
      };
    } else if (userRole === "property_owner") {
      whereClause = {
        [Op.and]: [
          { projectId: { [Op.in]: ownedProjectIds.length > 0 ? ownedProjectIds : [0] } },
          { uploadedByUserId: { [Op.ne]: userId } },
          {
            [Op.or]: [
              { targetRecipient: "property_owner" },
              { targetRecipient: "both" },
              { targetRecipient: "all" },
              { recipientUserId: userId },
            ],
          },
        ],
      };
    } else {
      // professional / engineer
      whereClause = {
        [Op.and]: [
          { projectId: { [Op.in]: assignedProjectIds.length > 0 ? assignedProjectIds : [0] } },
          { uploadedByUserId: { [Op.ne]: userId } },
          {
            [Op.or]: [
              { targetRecipient: "engineer" },
              { targetRecipient: "both" },
              { targetRecipient: "all" },
              { recipientUserId: userId },
            ],
          },
        ],
      };
    }

    const documents = await Document.findAll({
      where: whereClause,
      include: [
        { model: Project, as: "project", attributes: ["id", "title", "location", "ownerId"] },
        { model: User, as: "uploadedBy", attributes: ["id", "fullName", "email", "role", "verified"] },
        { model: User, as: "recipientUser", attributes: ["id", "fullName", "email", "role"] },
      ],
      order: [["uploadedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error("Failed to load received documents:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      include: [
        { model: Project, as: "project", attributes: ["id", "title", "location"] },
        { model: User, as: "uploadedBy", attributes: ["id", "fullName", "email", "verified"] },
      ],
      order: [["uploadedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const project = await Project.findByPk(document.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "administrator";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const filePath = path.join(process.cwd(), "uploads", path.basename(document.fileUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await document.destroy();

    return res.status(200).json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
