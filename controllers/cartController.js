const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add product to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    let cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [
          {
            product: productId,
            quantity,
          },
        ],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({
          product: productId,
          quantity,
        });
      }
    }

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate(
      "items.product"
    );

    res.status(200).json({
      message: "Product added to cart successfully",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get logged-in user's cart
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.product");

    if (!cart) {
      return res.status(200).json({
        user: req.user._id,
        items: [],
      });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error("Get cart error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update product quantity
const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({
        message: "Product ID and quantity are required",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        message: "Product is not in cart",
      });
    }

    item.quantity = quantity;

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate(
      "items.product"
    );

    res.status(200).json({
      message: "Cart quantity updated successfully",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Update cart error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Remove product from cart
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const itemExists = cart.items.some(
      (item) => item.product.toString() === productId
    );

    if (!itemExists) {
      return res.status(404).json({
        message: "Product is not in cart",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate(
      "items.product"
    );

    res.status(200).json({
      message: "Product removed from cart successfully",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Remove from cart error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(200).json({
        message: "Cart is already empty",
      });
    }

    cart.items = [];

    await cart.save();

    res.status(200).json({
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};