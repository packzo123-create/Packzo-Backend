const express = require("express");

const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/adminOrderController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Get all orders
router.get("/", protect, getAllOrders);

// Get single order
router.get("/:orderId", protect, getOrderById);

// Update order status/payment status
router.put("/:orderId/status", protect, updateOrderStatus);

module.exports = router;   