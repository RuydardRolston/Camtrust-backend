import User from "../models/userModel.js";
import bcrypt from "bcryptjs";

export const SignUp = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, role } = req.body;

    // 1. Required fields check
    if (!fullName || !email || !password || !confirmPassword || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Full name validation (matches frontend validateName expectations)
    if (fullName.trim().length < 3) {
      return res.status(400).json({ message: "Full name must be at least 3 characters" });
    }

    // 3. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // 4. Password strength validation (mirror your validatePassword rules)
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // 5. Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 6. Role validation — must match your <select> options
    const allowedRoles = ["property_owner", "professional", "administrator"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    // 7. Duplicate email check
    const existingUser = await User.findOne({ email: email.toLowerCase() });
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
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };

    return res.status(201).json({
      message: "Account created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};