const Admin = require("../models/Admin");
const User = require("../models/User");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ======================================================
// ALLOWED ADMIN EMAIL
// ======================================================

const ALLOWED_ADMIN_EMAIL = "atr903426@gmail.com";

// Generate JWT token
const generateToken = (adminId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { id: adminId },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ======================================================
// REGISTER ADMIN
// ======================================================

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ==================================================
    // ONLY ALLOWED EMAIL CAN REGISTER AS ADMIN
    // ==================================================

    if (normalizedEmail !== ALLOWED_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "This email is not authorized to create an admin account",
      });
    }

    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Register Admin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while registering admin",
    });
  }
};

// ======================================================
// LOGIN ADMIN
// ======================================================

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ==================================================
    // ONLY ALLOWED EMAIL CAN LOGIN AS ADMIN
    // ==================================================

    if (normalizedEmail !== ALLOWED_ADMIN_EMAIL) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const admin = await Admin.findOne({
      email: normalizedEmail,
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(admin._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login Admin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while logging in",
    });
  }
};

// ======================================================
// GET CURRENT LOGGED-IN ADMIN
// ======================================================

const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
      },
    });
  } catch (error) {
    console.error("Get Admin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching admin profile",
    });
  }
};

// ======================================================
// GET ALL USERS FOR ADMIN DASHBOARD
// ======================================================

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -verificationOTP -verificationOTPExpires")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Users fetch nahi ho paaye",
    });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getMe,
  getAllUsers,
};