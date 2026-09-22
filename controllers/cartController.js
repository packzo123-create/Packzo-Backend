const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ==========================================
// ADD PRODUCT TO CART
// ==========================================
const addToCart = async (req, res) => {
  try {
    const {
      productId,
      quantity = 1,
      selectedSize,
    } = req.body;

    // ------------------------------------------
    // VALIDATE PRODUCT ID
    // ------------------------------------------
    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    // ------------------------------------------
    // VALIDATE QUANTITY
    // ------------------------------------------
    if (quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1",
      });
    }

    // ------------------------------------------
    // NORMALIZE SELECTED SIZE
    // ------------------------------------------
    const normalizedSize =
      selectedSize !== undefined &&
      selectedSize !== null &&
      String(selectedSize).trim() !== ""
        ? String(selectedSize).trim()
        : null;

    // ------------------------------------------
    // FIND PRODUCT
    // ------------------------------------------
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // ------------------------------------------
    // IF PRODUCT HAS SIZES, SIZE IS REQUIRED
    // ------------------------------------------
    const productSizes = Array.isArray(product.sizes)
      ? product.sizes.filter(
          (size) =>
            size !== null &&
            size !== undefined &&
            String(size).trim() !== ""
        )
      : [];

    if (productSizes.length > 0 && !normalizedSize) {
      return res.status(400).json({
        message: "Please select a size",
      });
    }

    // ------------------------------------------
    // FIND USER CART
    // ------------------------------------------
    let cart = await Cart.findOne({
      user: req.user._id,
    });

    // ------------------------------------------
    // CREATE NEW CART
    // ------------------------------------------
    if (!cart) {
      cart = new Cart({
        user: req.user._id,

        items: [
          {
            product: productId,
            quantity,
            selectedSize: normalizedSize,
          },
        ],
      });
    }

    // ------------------------------------------
    // EXISTING CART
    // ------------------------------------------
    else {
      // Same product + same size = same cart item
      const existingItem = cart.items.find((item) => {
        const itemSize =
          item.selectedSize !== undefined &&
          item.selectedSize !== null
            ? String(item.selectedSize).trim()
            : null;

        return (
          item.product.toString() === productId &&
          itemSize === normalizedSize
        );
      });

      // ------------------------------------------
      // EXISTING PRODUCT + SAME SIZE
      // ------------------------------------------
      if (existingItem) {
        existingItem.quantity += quantity;
      }

      // ------------------------------------------
      // SAME PRODUCT BUT DIFFERENT SIZE
      // ------------------------------------------
      else {
        cart.items.push({
          product: productId,
          quantity,
          selectedSize: normalizedSize,
        });
      }
    }

    // ------------------------------------------
    // SAVE CART
    // ------------------------------------------
    await cart.save();

    // ------------------------------------------
    // GET UPDATED CART
    // ------------------------------------------
    const updatedCart = await Cart.findById(
      cart._id
    ).populate("items.product");

    // ------------------------------------------
    // SUCCESS RESPONSE
    // ------------------------------------------
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

// ==========================================
// GET LOGGED-IN USER'S CART
// ==========================================
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

// ==========================================
// UPDATE PRODUCT QUANTITY
// ==========================================
const updateCartItem = async (req, res) => {
  try {
    const {
      productId,
      quantity,
      selectedSize,
    } = req.body;

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

    // ------------------------------------------
    // NORMALIZE SIZE
    // ------------------------------------------
    const normalizedSize =
      selectedSize !== undefined &&
      selectedSize !== null &&
      String(selectedSize).trim() !== ""
        ? String(selectedSize).trim()
        : null;

    // ------------------------------------------
    // FIND PRODUCT + SIZE
    // ------------------------------------------
    const item = cart.items.find((item) => {
      const itemSize =
        item.selectedSize !== undefined &&
        item.selectedSize !== null
          ? String(item.selectedSize).trim()
          : null;

      return (
        item.product.toString() === productId &&
        itemSize === normalizedSize
      );
    });

    if (!item) {
      return res.status(404).json({
        message: "Product is not in cart",
      });
    }

    item.quantity = quantity;

    await cart.save();

    const updatedCart = await Cart.findById(
      cart._id
    ).populate("items.product");

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

// ==========================================
// REMOVE PRODUCT FROM CART
// ==========================================
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { selectedSize } = req.query;

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    // ------------------------------------------
    // NORMALIZE SIZE
    // ------------------------------------------
    const normalizedSize =
      selectedSize !== undefined &&
      selectedSize !== null &&
      String(selectedSize).trim() !== ""
        ? String(selectedSize).trim()
        : null;

    // ------------------------------------------
    // CHECK ITEM
    // ------------------------------------------
    const itemExists = cart.items.some((item) => {
      const itemSize =
        item.selectedSize !== undefined &&
        item.selectedSize !== null
          ? String(item.selectedSize).trim()
          : null;

      return (
        item.product.toString() === productId &&
        itemSize === normalizedSize
      );
    });

    if (!itemExists) {
      return res.status(404).json({
        message: "Product is not in cart",
      });
    }

    // ------------------------------------------
    // REMOVE PRODUCT + SIZE MATCH
    // ------------------------------------------
    cart.items = cart.items.filter((item) => {
      const itemSize =
        item.selectedSize !== undefined &&
        item.selectedSize !== null
          ? String(item.selectedSize).trim()
          : null;

      return !(
        item.product.toString() === productId &&
        itemSize === normalizedSize
      );
    });

    await cart.save();

    const updatedCart = await Cart.findById(
      cart._id
    ).populate("items.product");

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

// ==========================================
// CLEAR ENTIRE CART
// ==========================================
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