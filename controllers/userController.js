import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const SignUp = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, role } = req.body;

    // 1. Required fields check
    if (!fullName || !email || !password || !confirmPassword || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Full name validation
    if (fullName.trim().length < 3) {
      return res.status(400).json({ message: "Full name must be at least 3 characters" });
    }

    // 3. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // 4. Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // 5. Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 6. Role validation
    const allowedRoles = ["property_owner", "professional", "administrator"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    // 7. Duplicate email check
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    // 8. Hash password before storing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 9. Create user (never store confirmPassword)
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
    });

    // 10. Strip password before sending response
    return res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
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
    const { fullName, email, role, password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If email is being changed, check it isn't already taken by someone else
    if (email && email.toLowerCase() !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser) {
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

    if (role) {
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

    await user.save();

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
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