const express = require("express");

const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

const protectUser = require("../middleware/userAuthMiddleware");

const router = express.Router();

// Get logged-in user's cart
router.get("/", protectUser, getCart);

// Add product to cart
router.post("/add", protectUser, addToCart);

// Update cart item quantity
router.put("/update", protectUser, updateCartItem);

// Remove product from cart
router.delete("/remove/:productId", protectUser, removeFromCart);

// Clear entire cart
router.delete("/clear", protectUser, clearCart);

module.exports = router;