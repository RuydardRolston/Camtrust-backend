import multer from "multer";
import VerificationDocument from "../models/verificationDocumentModel.js";
import Verification from "../models/verificationModel.js";
import User from "../models/userModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

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

export const uploadVerificationDocumentMiddleware = upload.single("document");

export const uploadVerificationDocument = async (req, res) => {
  try {
    const { verificationId, documentType } = req.body;

    if (!verificationId) {
      return res.status(400).json({ success: false, message: "Verification ID is required" });
    }

    const verification = await Verification.findByPk(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification not found" });
    }

    const isAdmin = req.user.role === "administrator";
    const isOwner = verification.professionalId === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Document file is required" });
    }

    const document = await VerificationDocument.create({
      verificationId: parseInt(verificationId),
      userId: req.user.userId,
      fileName: req.file.originalname,
      fileUrl: "/uploads/" + req.file.filename,
      documentType: documentType || "other",
    });

    return res.status(201).json({ success: true, document });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getVerificationDocuments = async (req, res) => {
  try {
    const { verificationId } = req.params;

    const verification = await Verification.findByPk(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification not found" });
    }

    const isAdmin = req.user.role === "administrator";
    const isOwner = verification.professionalId === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const documents = await VerificationDocument.findAll({
      where: { verificationId: parseInt(verificationId) },
      include: [
        { model: User, as: "uploader", attributes: ["id", "fullName", "email"] },
      ],
    });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
