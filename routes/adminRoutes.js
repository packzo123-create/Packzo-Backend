const express = require("express");

const {
  registerAdmin,
  loginAdmin,
  getMe,
  getAllUsers,
} = require("../controllers/adminController");

const {
  getAllOrders,
} = require("../controllers/orderController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Register admin
router.post("/register", registerAdmin);

// Login admin
router.post("/login", loginAdmin);

// Get current logged-in admin
router.get("/me", protect, getMe);

// Get all users
router.get("/users", protect, getAllUsers);

// Get all orders for admin
router.get("/orders", protect, getAllOrders);

module.exports = router;