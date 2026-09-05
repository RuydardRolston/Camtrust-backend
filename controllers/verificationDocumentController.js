import multer from "multer";
import VerificationDocument from "../models/verificationDocumentModel.js";
import Verification from "../models/verificationModel.js";
import User from "../models/userModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { runKycDocumentAnalysis } from "./verificationController.js";

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

export const uploadVerificationDocumentMiddleware = upload.single("document");

export const uploadVerificationDocument = async (req, res) => {
  try {
    let { verificationId, documentType } = req.body;

    let verification = null;
    if (verificationId) {
      verification = await Verification.findByPk(verificationId);
    } else {
      verification = await Verification.findOne({
        where: { professionalId: req.user.userId }
      });
    }

    if (!verification) {
      verification = await Verification.create({
        administratorId: null,
        professionalId: req.user.userId,
        status: "Pending",
        notes: "Professional submitted verification document."
      });
    }

    const isAdmin = req.user.role === "administrator";
    const isOwner = verification.professionalId === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Document file is required" });
    }

    const validTypes = [
      "employment_attestation",
      "employment_certificate",
      "license",
      "certificate",
      "id_card",
      "registration",
      "other"
    ];

    const finalType = validTypes.includes(documentType) ? documentType : "certificate";

    const document = await VerificationDocument.create({
      verificationId: verification.id,
      userId: req.user.userId,
      fileName: req.file.originalname,
      fileUrl: "/uploads/" + req.file.filename,
      documentType: finalType,
    });

    const user = await User.findByPk(verification.professionalId);
    const allDocs = await VerificationDocument.findAll({
      where: { verificationId: verification.id }
    });
    const analysis = runKycDocumentAnalysis(user, allDocs);
    verification.aiAnalysis = JSON.stringify(analysis);
    if (verification.status === "Action Required") {
      verification.status = "Pending";
    }
    await verification.save();

    return res.status(201).json({ success: true, document, verification, analysis });
  } catch (error) {
    console.error("Failed to upload verification document:", error);
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
      order: [["uploadedAt", "DESC"]]
    });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
