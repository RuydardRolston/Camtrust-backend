import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Notification from "../models/notificationModel.js";
import { emitToUser, getIO } from "../utils/socket.js";

export const SignUp = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, role } = req.body;

    if (!fullName || !email || !password || !confirmPassword || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (fullName.trim().length < 3) {
      return res.status(400).json({ message: "Full name must be at least 3 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const allowedRoles = ["property_owner", "professional"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected. Administrators are created from Users Management." });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
    });

    const admins = await User.findAll({ where: { role: "administrator" } });
    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        message: `New user "${fullName}" (${email}) registered as ${role}`,
        status: "unread",
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        verified: user.verified,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Required fields check
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2. Find user by email
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Compare submitted password with hashed password in DB
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        message: "This account has been deactivated. Contact a CamTrust administrator.",
      });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    // 5. Send response
    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        verified: user.verified,
        status: user.status,
        specialty: user.specialty,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//GET  all users by ID
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes:{exclude:["password"]} // Exclude password from the response
    });
    return res.status(200).json({ message: "Users fetched successfully", users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const adminCreateUser = async (req, res) => {
  try {
    const { fullName, email, password, role, phone, specialty, status } = req.body;

    if (!fullName || !email || !role) {
      return res.status(400).json({ message: "Full name, email and role are required" });
    }

    const allowedRoles = ["property_owner", "professional", "administrator"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const rawPassword = password && password.length >= 8 ? password : "CamTrust123!";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      phone: phone || null,
      specialty: specialty || null,
      status: status === "inactive" ? "inactive" : "active",
      verified: role === "administrator" || role === "property_owner",
    });

    return res.status(201).json({
      success: true,
      message: password && password.length >= 8
        ? "User created successfully"
        : "User created successfully. Temporary password: CamTrust123!",
      temporaryPassword: password && password.length >= 8 ? undefined : "CamTrust123!",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        verified: user.verified,
        phone: user.phone,
        specialty: user.specialty,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getVerifiedProfessionals = async (req, res) => {
  try {
    const professionals = await User.findAll({
      where: { role: "professional", verified: true },
      attributes: { exclude: ["password"] },
    });
    return res.status(200).json({ success: true, professionals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET a single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] }, // never expose password hash
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User fetched successfully", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// UPDATE a user by ID
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, password, phone, address, specialty, status, employeeId, verified } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isAdmin = req.user?.role === "administrator" || req.user?.role === "admin";
    const isSelf = req.user?.userId === parseInt(id, 10);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to update this profile." });
    }

    // If email is being changed, check it isn't already taken by someone else
    if (email && email.toLowerCase() !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ message: "This email is already in use" });
      }
      user.email = email.toLowerCase();
    }

    if (fullName) {
      if (fullName.trim().length < 3) {
        return res.status(400).json({ message: "Full name must be at least 3 characters" });
      }
      user.fullName = fullName.trim();
    }

    if (role && isAdmin) {
      const allowedRoles = ["property_owner", "professional", "administrator"];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role selected" });
      }
      user.role = role;
    }

    // Password update is optional, hashed if provided
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (specialty !== undefined) user.specialty = specialty;
    if (employeeId !== undefined) user.employeeId = employeeId;
    if (status !== undefined && ["active", "inactive"].includes(status)) user.status = status;

    let verificationChanged = false;
    if (verified !== undefined && isAdmin) {
      const newVerified = Boolean(verified);
      if (user.verified !== newVerified) {
        user.verified = newVerified;
        verificationChanged = true;
      }
    }

    await user.save();

    if (verificationChanged) {
      const notifMsg = user.verified
        ? "Congratulations! Your civil engineer profile has been VERIFIED by the administrator. Your verified badge is now active."
        : "Your civil engineer profile verification status has been updated to UNVERIFIED by the administrator.";

      try {
        const notif = await Notification.create({
          userId: user.id,
          message: notifMsg,
          status: "unread",
        });
        emitToUser(user.id, "notification:new", {
          ...notif.toJSON(),
          targetTab: "verification",
        });
        getIO().to("global").emit("verification:updated", {
          userId: user.id,
          verified: user.verified,
        });
      } catch (err) {
        console.error("Failed to notify user of verification change:", err);
      }
    }

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        specialty: user.specialty,
        role: user.role,
        status: user.status,
        verified: user.verified,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// TOGGLE user verification by Admin
export const toggleUserVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.verified = verified !== undefined ? Boolean(verified) : !user.verified;
    await user.save();

    const notifMsg = user.verified
      ? "Congratulations! Your professional engineer account has been VERIFIED by the administrator. Your verified badge is now visible on projects."
      : "Your engineer account verification status has been set to UNVERIFIED by the administrator.";

    try {
      const notif = await Notification.create({
        userId: user.id,
        message: notifMsg,
        status: "unread",
      });
      emitToUser(user.id, "notification:new", {
        ...notif.toJSON(),
        targetTab: "verification",
      });
      getIO().to("global").emit("verification:updated", {
        userId: user.id,
        verified: user.verified,
      });
    } catch (err) {
      console.error("Failed to emit notification:", err);
    }

    return res.status(200).json({
      success: true,
      message: `User verification updated to ${user.verified ? 'Verified' : 'Unverified'}`,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        verified: user.verified,
        specialty: user.specialty,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE a user by ID
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};