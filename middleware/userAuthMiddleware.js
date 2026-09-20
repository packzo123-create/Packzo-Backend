const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protectUser = async (req, res, next) => {
  try {
    // ==========================================
    // GET TOKEN
    // ==========================================
    // Priority:
    // 1. HTTP-only cookie
    // 2. Authorization Bearer token (backward compatibility)

    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    // ==========================================
    // TOKEN CHECK
    // ==========================================

    if (!token) {
      return res.status(401).json({
        success: false,
        isLoggedIn: false,
        message: "Not authorized. Please login first.",
      });
    }

    // ==========================================
    // JWT SECRET CHECK
    // ==========================================

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET is missing in environment variables"
      );

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    // ==========================================
    // VERIFY TOKEN
    // ==========================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ==========================================
    // FIND USER
    // ==========================================

    const user = await User.findById(decoded.id).select(
      "-password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        isLoggedIn: false,
        message: "User not found",
      });
    }

    // ==========================================
    // ATTACH USER TO REQUEST
    // ==========================================

    req.user = user;

    return next();
  } catch (error) {
    console.error(
      "User Auth Middleware Error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      isLoggedIn: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = protectUser;