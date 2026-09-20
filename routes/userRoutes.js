const express = require("express");

const {
  registerUser,
  verifyUserEmail,
  resendVerificationOTP,
  loginUser,
  getUserProfile,
  checkAuth,
  logoutUser,
} = require("../controllers/userController");

const protectUser = require("../middleware/userAuthMiddleware");

const router = express.Router();

// ===============================
// Public Routes
// ===============================

// User signup
router.post("/register", registerUser);

// User login
router.post("/login", loginUser);

// Verify email with OTP
router.post("/verify-email", verifyUserEmail);

// Resend verification OTP
router.post("/resend-otp", resendVerificationOTP);

// User logout
router.post("/logout", logoutUser);

// ===============================
// Protected Routes
// ===============================

// Check current authentication
router.get("/check-auth", protectUser, checkAuth);

// Get current user profile
router.get("/profile", protectUser, getUserProfile);

module.exports = router;