import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import Verification from "../models/verificationModel.js";
import SiteEvidence from "../models/siteEvidenceModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { Op } from "sequelize";

export const getPlatformStats = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const totalProjects = await Project.count();
      const activeProjects = await Project.count({
        where: { status: ["In Progress", "Approved"] },
      });
      const verifiedProfessionals = await User.count({
        where: { role: "professional", verified: true },
      });

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const evidenceThisWeek = await SiteEvidence.count({
        where: {
          capturedAt: {
            [Op.gte]: oneWeekAgo,
          },
        },
      });

      const pendingVerifications = await Verification.count({
        where: { status: "Pending" },
      });

      return res.status(200).json({
        success: true,
        stats: {
          totalProjects,
          activeProjects,
          verifiedProfessionals,
          evidenceSubmittedThisWeek: evidenceThisWeek,
          pendingVerifications,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const toggleUserStatus = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      user.status = status;
      await user.save();

      return res.status(200).json({ success: true, user: { id: user.id, status: user.status } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];
