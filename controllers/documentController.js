import multer from "multer";
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
    const { projectId, category } = req.body;

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

    const document = await Document.create({
      projectId,
      fileName: req.file.originalname,
      fileUrl,
      category,
      uploadedByUserId: req.user.userId,
    });

    emitToProject(projectId, "document:new", document);

    if (!isOwner) {
      const notification = await Notification.create({
        userId: project.ownerId,
        message: `A new document has been uploaded to project "${project.title}"`,
        status: "unread",
      });
      emitToUser(project.ownerId, "notification:new", notification);
    }

    return res.status(201).json({ success: true, document });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProjectDocuments = async (req, res) => {
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

    const documents = await Document.findAll({ where: { projectId } });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error(error);
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
