import ProgressReport from "../models/progressReportModel.js";
import Project from "../models/projectModel.js";
import Milestone from "../models/milestoneModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { emitToProject, emitToUser } from "../utils/socket.js";

export const submitReport = [
  authenticateToken,
  authorizeRoles("professional"),
  async (req, res) => {
    try {
      const {
        projectId,
        milestoneId,
        summary,
        workCompleted,
        workInProgress,
        workRemaining,
        observations,
        issues,
        recommendations,
        progressPercentage,
        pdfUrl
      } = req.body;

      if (!projectId) {
        return res.status(400).json({ success: false, message: "Project ID is required" });
      }

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      const engineerAccount = await User.findByPk(req.user.userId);
      if (!engineerAccount?.verified) {
        return res.status(403).json({
          success: false,
          message: "Your account must be verified by an administrator before submitting progress reports.",
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

      let parsedMilestoneId = milestoneId ? parseInt(milestoneId) : null;
      let parsedProgress = progressPercentage !== undefined && progressPercentage !== null ? parseInt(progressPercentage) : null;

      // If milestone is specified, update milestone progress
      if (parsedMilestoneId) {
        const milestone = await Milestone.findByPk(parsedMilestoneId);
        if (milestone && parsedProgress !== null) {
          milestone.completionRate = parsedProgress;
          milestone.status = parsedProgress >= 100 ? "Completed" : parsedProgress > 0 ? "In Progress" : "Pending";
          await milestone.save();
          emitToProject(projectId, "milestone:updated", milestone);
        }
      }

      const engineer = await User.findByPk(req.user.userId);

      const report = await ProgressReport.create({
        projectId: parseInt(projectId),
        professionalId: req.user.userId,
        milestoneId: parsedMilestoneId,
        summary: summary || `Construction progress update (${parsedProgress || 0}% completion)`,
        workCompleted: workCompleted || null,
        workInProgress: workInProgress || null,
        workRemaining: workRemaining || null,
        observations: observations || null,
        issues: issues || null,
        recommendations: recommendations || null,
        progressPercentage: parsedProgress,
        pdfUrl: pdfUrl || null,
        generatedAt: new Date(),
      });

      const fullReport = await ProgressReport.findByPk(report.id, {
        include: [
          { model: Project, as: "project" },
          { model: Milestone, as: "milestone" },
          { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
        ],
      });

      // Notify Project Owner
      const notification = await Notification.create({
        userId: project.ownerId,
        message: `New official progress report submitted for "${project.title}" by ${engineer?.fullName || 'Verified Engineer'} (${parsedProgress || 0}% progress).`,
        status: "unread",
      });
      emitToUser(project.ownerId, "notification:new", notification);
      emitToProject(projectId, "report:new", fullReport);

      return res.status(201).json({ success: true, report: fullReport });
    } catch (error) {
      console.error("Failed to submit report:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

export const getProjectReports = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.query.projectId;

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

    const reports = await ProgressReport.findAll({
      where: { projectId },
      include: [
        { model: Milestone, as: "milestone" },
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
        { model: Project, as: "project", attributes: ["id", "title", "location", "status", "budget", "startDate"] },
      ],
      order: [["generatedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await ProgressReport.findByPk(id, {
      include: [
        {
          model: Project,
          as: "project",
          include: [{ model: User, as: "owner", attributes: ["id", "fullName", "email"] }],
        },
        { model: Milestone, as: "milestone" },
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "phone", "verified", "specialty"] },
      ],
    });

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const isOwner = report.project?.ownerId === req.user.userId;
    const isAdmin = req.user.role === "administrator";
    const isAssigned = report.professionalId === req.user.userId;

    if (!isOwner && !isAdmin && !isAssigned) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Fetch related evidence and documents for the report
    const evidence = await SiteEvidence.findAll({
      where: { projectId: report.projectId },
      order: [["capturedAt", "DESC"]],
    });

    const documents = await Document.findAll({
      where: { projectId: report.projectId },
      order: [["uploadedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, report, evidence, documents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let whereCondition = {};
    if (role === 'professional') {
      whereCondition = { professionalId: userId };
    } else if (role === 'property_owner') {
      const ownedProjects = await Project.findAll({ where: { ownerId: userId } });
      const projectIds = ownedProjects.map((p) => p.id);
      whereCondition = { projectId: projectIds };
    }

    const reports = await ProgressReport.findAll({
      where: whereCondition,
      include: [
        { model: Project, as: "project", attributes: ["id", "title", "location"] },
        { model: Milestone, as: "milestone" },
        { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
      ],
      order: [["generatedAt", "DESC"]],
    });

    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllReports = [
  authenticateToken,
  authorizeRoles("administrator"),
  async (req, res) => {
    try {
      const reports = await ProgressReport.findAll({
        include: [
          { model: Project, as: 'project', attributes: ['id', 'title', 'location'] },
          { model: Milestone, as: 'milestone' },
          { model: User, as: 'professional', attributes: ['id', 'fullName', 'email', 'verified', "specialty"] },
        ],
        order: [["generatedAt", "DESC"]],
      });

      return res.status(200).json({ success: true, reports });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
];

/**
 * In-app report delivery: instead of emailing, the report is delivered to the
 * project owner as a direct message + notification inside the application.
 * Works in both directions: engineer -> owner and owner -> engineer.
 */
export const sendReportToOwner = [
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const senderId = req.user.userId;

      const report = await ProgressReport.findByPk(id, {
        include: [
          {
            model: Project,
            as: "project",
            include: [{ model: User, as: "owner", attributes: ["id", "fullName", "email"] }],
          },
          { model: Milestone, as: "milestone" },
          { model: User, as: "professional", attributes: ["id", "fullName", "email", "verified", "specialty"] },
        ],
      });

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }

      const isOwner = report.project?.ownerId === senderId;
      const isAssigned = report.professionalId === senderId;
      const isAdmin = req.user.role === "administrator";
      if (!isOwner && !isAssigned && !isAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // In-app recipient: owner sends to the engineer, engineer sends to the owner.
      const recipientId = isOwner ? report.professionalId : report.project?.ownerId;
      if (!recipientId || recipientId === senderId) {
        return res.status(400).json({ success: false, message: "No in-app recipient for this report" });
      }

      const recipient = await User.findByPk(recipientId, { attributes: ["id", "fullName"] });

      const summaryText =
        `📋 Progress Report — "${report.project?.title || "Construction Project"}"\n` +
        `Overall progress: ${report.progressPercentage ?? 0}%\n` +
        (report.milestone?.label ? `Milestone: ${report.milestone.label}\n` : "") +
        (report.summary ? `\n${report.summary}` : "");

      const message = await Message.create({
        senderId,
        receiverId: recipientId,
        projectId: report.projectId,
        body: summaryText,
      });

      const payload = {
        ...message.toJSON(),
        reportId: report.id,
        sender: { id: senderId, fullName: req.user.fullName || null },
      };

      emitToUser(recipientId, "message:new", payload);
      emitToUser(senderId, "message:sent", payload);

      const notification = await Notification.create({
        userId: recipientId,
        message: `Progress report for "${report.project?.title}" was shared with you in-app by ${req.user.fullName || "a project member"}.`,
        status: "unread",
      });
      emitToUser(recipientId, "notification:new", {
        ...notification.toJSON(),
        targetTab: "messages",
        partnerId: senderId,
        reportId: report.id,
      });

      return res.status(200).json({
        success: true,
        message: `Report delivered in-app to ${recipient?.fullName || "recipient"}`,
        reportId: report.id,
      });
    } catch (error) {
      console.error("Failed to deliver report in-app:", error);
      return res.status(500).json({ success: false, message: "Failed to deliver report: " + error.message });
    }
  },
];