import Verification from "../models/verificationModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { getIO } from "../utils/socket.js";

export const requestVerification = [
  authenticateToken,
  authorizeRoles("professional"),
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const existing = await Verification.findOne({
        where: { professionalId: req.user.userId, status: "Pending" },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: "Verification request already pending" });
      }

      const verification = await Verification.create({
        administratorId: req.user.userId,
        professionalId: req.user.userId,
        status: "Pending",
      });

      return res.status(201).json({ success: true, verification });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const getPendingVerifications = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const verifications = await Verification.findAll({
        where: { status: "Pending" },
        include: [
          { model: User, as: "professional", attributes: ["id", "fullName", "email"] },
        ],
      });

      return res.status(200).json({ success: true, verifications });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const approveVerification = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const verification = await Verification.findByPk(id);
      if (!verification) {
        return res.status(404).json({ success: false, message: "Verification not found" });
      }

      verification.status = "Approved";
      await verification.save();

      const professional = await User.findByPk(verification.professionalId);
      if (professional) {
        professional.verified = true;
        await professional.save();
      }

      await Notification.create({
        userId: verification.professionalId,
        message: "Your verification has been approved",
        status: "unread",
      });

      getIO().to("global").emit("verification:updated", verification);

      return res.status(200).json({ success: true, verification });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const rejectVerification = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const verification = await Verification.findByPk(id);
      if (!verification) {
        return res.status(404).json({ success: false, message: "Verification not found" });
      }

      verification.status = "Rejected";
      await verification.save();

      await Notification.create({
        userId: verification.professionalId,
        message: "Your verification request has been rejected",
        status: "unread",
      });

      getIO().to("global").emit("verification:updated", verification);

      return res.status(200).json({ success: true, verification });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];
