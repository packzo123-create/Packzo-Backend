const express = require("express");

const {
  placeOrder,
  getMyOrders,
  getSingleOrder,
  cancelOrder,
} = require("../controllers/orderController");

const protectUser = require("../middleware/userAuthMiddleware");

const router = express.Router();

// Place COD order
router.post("/place", protectUser, placeOrder);

// Get all orders of logged-in user
router.get("/my-orders", protectUser, getMyOrders);

// Get single order
router.get("/:orderId", protectUser, getSingleOrder);

// Cancel order
router.put("/:orderId/cancel", protectUser, cancelOrder);

module.exports = router;