import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Project from "../models/projectModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import Notification from "../models/notificationModel.js";
import { Op } from "sequelize";
import { emitToUser } from "../utils/socket.js";

const isAdminRole = (role) => role === "admin" || role === "administrator";

/**
 * Return the list of users the current user is allowed to communicate with:
 * - Administrators: everyone
 * - Project Owners: engineers assigned to their projects + administrators
 * - Engineers: owners of projects they are assigned to + administrators
 */
export const getContacts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (isAdminRole(role)) {
      const users = await User.findAll({
        where: { id: { [Op.ne]: userId } },
        attributes: ["id", "fullName", "email", "role", "verified"],
        order: [["fullName", "ASC"]],
      });
      const contactsWithUnread = await Promise.all(
        users.map(async (u) => {
          const unreadCount = await Message.count({
            where: { senderId: u.id, receiverId: userId, readAt: null },
          });
          return { ...u.toJSON(), unreadCount };
        })
      );
      return res.status(200).json({ success: true, contacts: contactsWithUnread });
    }

    const partnerIds = new Set();

    // 1. If user is an engineer/professional, find owners of projects they are assigned to
    const myAssignments = await ProjectAssignment.findAll({
      where: { professionalId: userId },
      attributes: ["projectId"],
    });
    const assignedProjectIds = myAssignments.map((a) => a.projectId);

    if (assignedProjectIds.length > 0) {
      const assignedProjects = await Project.findAll({
        where: { id: { [Op.in]: assignedProjectIds } },
        attributes: ["ownerId"],
      });
      for (const p of assignedProjects) {
        if (p.ownerId && p.ownerId !== userId) {
          partnerIds.add(p.ownerId);
        }
      }
    }

    // 2. If user is a project owner, find professionals assigned to their projects
    const ownedProjects = await Project.findAll({
      where: { ownerId: userId },
      attributes: ["id"],
    });
    const ownedProjectIds = ownedProjects.map((p) => p.id);

    if (ownedProjectIds.length > 0) {
      const assignmentsOnMyProjects = await ProjectAssignment.findAll({
        where: { projectId: { [Op.in]: ownedProjectIds } },
        attributes: ["professionalId"],
      });
      for (const a of assignmentsOnMyProjects) {
        if (a.professionalId && a.professionalId !== userId) {
          partnerIds.add(a.professionalId);
        }
      }
    }

    // 3. Add administrators so every user can reach support/admin
    const admins = await User.findAll({
      where: {
        role: { [Op.in]: ["admin", "administrator"] },
        id: { [Op.ne]: userId },
      },
      attributes: ["id", "fullName", "email", "role", "verified"],
    });
    admins.forEach((a) => partnerIds.add(a.id));

    if (!partnerIds.size) {
      return res.status(200).json({ success: true, contacts: [] });
    }

    const contacts = await User.findAll({
      where: { id: { [Op.in]: [...partnerIds] } },
      attributes: ["id", "fullName", "email", "role", "verified"],
      order: [["fullName", "ASC"]],
    });

    const contactsWithUnread = await Promise.all(
      contacts.map(async (c) => {
        const unreadCount = await Message.count({
          where: { senderId: c.id, receiverId: userId, readAt: null },
        });
        return { ...c.toJSON(), unreadCount };
      })
    );

    return res.status(200).json({ success: true, contacts: contactsWithUnread });
  } catch (error) {
    console.error("Failed to get contacts:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Get the conversation between the current user and another user.
 * Marks the unread messages from the partner as read.
 */
export const getConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const partnerId = parseInt(req.params.partnerId, 10);

    if (!partnerId || Number.isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: "Partner user ID is required" });
    }

    // Ensure the partner exists
    const partner = await User.findByPk(partnerId, {
      attributes: ["id", "fullName", "email", "role", "verified"],
    });
    if (!partner) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Authorization: admins can talk to anyone; otherwise both must share a project or be admin-linked
    if (!isAdminRole(req.user.role) && !isAdminRole(partner.role)) {
      const allowed = await areLinked(userId, partnerId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: you can only message users you share a project with (or administrators).",
        });
      }
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      include: [
        { model: User, as: "sender", attributes: ["id", "fullName"] },
        { model: User, as: "receiver", attributes: ["id", "fullName"] },
      ],
      order: [["createdAt", "ASC"]],
      limit: 200,
    });

    // Mark incoming messages as read
    await Message.update(
      { readAt: new Date() },
      { where: { senderId: partnerId, receiverId: userId, readAt: null } }
    );

    return res.status(200).json({ success: true, partner, messages });
  } catch (error) {
    console.error("Failed to get conversation:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/** Send a direct message. Optionally tag it with a projectId. */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, body, projectId } = req.body;

    if (!receiverId || !body || !body.trim()) {
      return res.status(400).json({ success: false, message: "Receiver and message body are required" });
    }
    if (parseInt(receiverId, 10) === senderId) {
      return res.status(400).json({ success: false, message: "You cannot message yourself" });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }

    if (!isAdminRole(req.user.role) && !isAdminRole(receiver.role)) {
      const allowed = await areLinked(senderId, parseInt(receiverId, 10));
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: you can only message users you share a project with (or administrators).",
        });
      }
    }

    const message = await Message.create({
      senderId,
      receiverId: parseInt(receiverId, 10),
      projectId: projectId ? parseInt(projectId, 10) : null,
      body: body.trim(),
    });

    const sender = await User.findByPk(senderId, { attributes: ["id", "fullName"] });
    const payload = {
      ...message.toJSON(),
      sender: { id: senderId, fullName: sender?.fullName || null },
    };

    // Real-time delivery
    emitToUser(receiverId, "message:new", payload);
    emitToUser(senderId, "message:sent", payload);

    // Persist a notification so offline users see it later
    try {
      const notification = await Notification.create({
        userId: parseInt(receiverId, 10),
        message: `New message from ${sender?.fullName || "a user"}: "${body.trim().slice(0, 80)}"`,
        status: "unread",
      });
      emitToUser(receiverId, "notification:new", {
        ...notification.toJSON(),
        targetTab: "messages",
        partnerId: senderId,
      });
    } catch (notifError) {
      console.error("Failed to create message notification:", notifError);
    }

    return res.status(201).json({ success: true, message: payload });
  } catch (error) {
    console.error("Failed to send message:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/** Unread message count for the current user (badge in the sidebar). */
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.count({
      where: { receiverId: req.user.userId, readAt: null },
    });
    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Failed to count unread messages:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/** True when the two users share at least one project (either direction) or one is an admin. */
const areLinked = async (userId, partnerId) => {
  const partner = await User.findByPk(partnerId, { attributes: ["role"] });
  if (partner && isAdminRole(partner.role)) {
    return true;
  }

  // 1. Projects owned by userId where partner is assigned
  const ownedProjects = await Project.findAll({
    where: { ownerId: userId },
    attributes: ["id"],
  });
  const ownedProjectIds = ownedProjects.map((p) => p.id);
  if (ownedProjectIds.length > 0) {
    const assigned = await ProjectAssignment.count({
      where: { projectId: { [Op.in]: ownedProjectIds }, professionalId: partnerId },
    });
    if (assigned > 0) return true;
  }

  // 2. Projects owned by partnerId where userId is assigned
  const partnerProjects = await Project.findAll({
    where: { ownerId: partnerId },
    attributes: ["id"],
  });
  const partnerProjectIds = partnerProjects.map((p) => p.id);
  if (partnerProjectIds.length > 0) {
    const assigned = await ProjectAssignment.count({
      where: { projectId: { [Op.in]: partnerProjectIds }, professionalId: userId },
    });
    if (assigned > 0) return true;
  }

  return false;
};
