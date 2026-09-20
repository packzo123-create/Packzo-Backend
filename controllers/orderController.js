const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ==========================================
// PLACE COD ORDER
// ==========================================
const placeOrder = async (req, res) => {
  try {
    console.log("========== PLACE ORDER START ==========");
    console.log("User ID:", req.user?._id);
    console.log("Request Body:", JSON.stringify(req.body, null, 2));

    const {
      shippingAddress,
      items: frontendItems = [],
    } = req.body;

    // ------------------------------------------
    // CHECK AUTHENTICATION
    // ------------------------------------------
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    // ------------------------------------------
    // CHECK SHIPPING ADDRESS
    // ------------------------------------------
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    const requiredFields = [
      "name",
      "phone",
      "city",
      "state",
      "pincode",
    ];

    for (const field of requiredFields) {
      if (
        !shippingAddress[field] ||
        String(shippingAddress[field]).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} is required in shipping address`,
        });
      }
    }

    // ------------------------------------------
    // FIND BACKEND CART
    // ------------------------------------------
    const cart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.product");

    console.log("Cart found:", !!cart);
    console.log(
      "Backend cart items count:",
      cart?.items?.length || 0
    );
    console.log(
      "Frontend items count:",
      Array.isArray(frontendItems)
        ? frontendItems.length
        : 0
    );

    // ------------------------------------------
    // SELECT CART ITEMS
    // ------------------------------------------
    let sourceItems = [];

    // First priority: MongoDB backend cart
    if (
      cart &&
      Array.isArray(cart.items) &&
      cart.items.length > 0
    ) {
      sourceItems = cart.items;
      console.log("Using items from backend cart");
    }

    // Fallback: frontend cart items
    else if (
      Array.isArray(frontendItems) &&
      frontendItems.length > 0
    ) {
      sourceItems = frontendItems;
      console.log(
        "Backend cart empty. Using frontend cart items"
      );
    }

    // No items anywhere
    else {
      return res.status(400).json({
        success: false,
        message:
          "Your cart is empty. Please add products to cart before placing order.",
      });
    }

    // ------------------------------------------
    // CONVERT CART ITEMS INTO ORDER ITEMS
    // ------------------------------------------
    const orderItems = [];

    for (const item of sourceItems) {
      let product = item.product;

      // ------------------------------------------
      // GET PRODUCT ID FROM DIFFERENT STRUCTURES
      // ------------------------------------------
      let productId = null;

      if (product && typeof product === "object") {
        productId = product._id;
      } else if (product) {
        productId = product;
      }

      if (!productId) {
        productId =
          item.productId ||
          item.product?._id ||
          item._id;
      }

      // Validate product ID
      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(productId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or missing product ID in cart",
        });
      }

      // ------------------------------------------
      // FETCH PRODUCT FROM DATABASE
      // ------------------------------------------
      const productFromDatabase = await Product.findById(
        productId
      );

      if (!productFromDatabase) {
        return res.status(400).json({
          success: false,
          message:
            "One of the products in your cart no longer exists",
        });
      }

      // ------------------------------------------
      // PRODUCT DETAILS
      // ------------------------------------------
      const title =
        productFromDatabase.title ||
        productFromDatabase.name ||
        item.title ||
        item.name ||
        "Product";

      const price = Number(
        item.price ??
          productFromDatabase.price ??
          0
      );

      const quantity = Number(item.quantity || 1);

      if (Number.isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for product: ${title}`,
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product: ${title}`,
        });
      }

      const image =
        productFromDatabase.images?.[0] ||
        productFromDatabase.image ||
        item.image ||
        "";

      orderItems.push({
        product: productFromDatabase._id,
        title,
        image,
        price,
        quantity,
      });
    }

    // ------------------------------------------
    // CHECK VALID ORDER ITEMS
    // ------------------------------------------
    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid products found in cart",
      });
    }

    // ------------------------------------------
    // CALCULATE TOTAL AMOUNT
    // ------------------------------------------
    const totalAmount = orderItems.reduce(
      (total, item) => {
        return total + item.price * item.quantity;
      },
      0
    );

    console.log("Order items:", orderItems);
    console.log("Total amount:", totalAmount);

    // ------------------------------------------
    // PREPARE ORDER DATA
    // ------------------------------------------
    const orderData = {
      user: req.user._id,

      items: orderItems,

      totalAmount,

      shippingAddress: {
        name: String(shippingAddress.name).trim(),

        phone: String(shippingAddress.phone).trim(),

        street: shippingAddress.street
          ? String(shippingAddress.street).trim()
          : "",

        city: String(shippingAddress.city).trim(),

        state: String(shippingAddress.state).trim(),

        pincode: String(shippingAddress.pincode).trim(),

        country: shippingAddress.country
          ? String(shippingAddress.country).trim()
          : "India",
      },

      paymentMethod: "COD",

      paymentStatus: "Pending",

      orderStatus: "Pending",
    };

    console.log(
      "Order data before saving:",
      JSON.stringify(orderData, null, 2)
    );

    // ------------------------------------------
    // SAVE ORDER IN MONGODB
    // ------------------------------------------
    const order = await Order.create(orderData);

    console.log("======================================");
    console.log(
      "ORDER SAVED SUCCESSFULLY IN MONGODB"
    );
    console.log("Order ID:", order._id);
    console.log("======================================");

    // ------------------------------------------
    // CLEAR BACKEND CART AFTER ORDER SUCCESS
    // ------------------------------------------
    if (cart) {
      cart.items = [];
      await cart.save();

      console.log(
        "Backend cart cleared successfully"
      );
    }

    // ------------------------------------------
    // POPULATE ORDER DETAILS
    // ------------------------------------------
    const populatedOrder = await Order.findById(
      order._id
    )
      .populate("user", "name email phone")
      .populate("items.product");

    // ------------------------------------------
    // SEND SUCCESS RESPONSE
    // ------------------------------------------
    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("======================================");
    console.error("PLACE ORDER ERROR");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    console.error("======================================");

    return res.status(500).json({
      success: false,
      message: "Server error while placing order",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL ORDERS OF LOGGED-IN USER
// ==========================================
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    })
      .populate("items.product")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error(
      "Get my orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE ORDER OF LOGGED-IN USER
// ==========================================
const getSingleOrder = async (req, res) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.orderId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    }).populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Get single order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==========================================
// CANCEL ORDER
// ==========================================
const cancelOrder = async (req, res) => {
  try {
    const { reason = "" } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.orderId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      !["Pending", "Confirmed"].includes(
        order.orderStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because its status is ${order.orderStatus}`,
      });
    }

    order.orderStatus = "Cancelled";
    order.cancelReason = reason;
    order.cancelledAt = new Date();

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error(
      "Cancel order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL ORDERS FOR ADMIN
// ==========================================
const getAllOrders = async (req, res) => {
  try {
    console.log(
      "========== ADMIN GET ORDERS =========="
    );

    const orders = await Order.find({})
      .populate("user", "name email phone")
      .populate("items.product")
      .sort({ createdAt: -1 });

    console.log(
      "Total orders found:",
      orders.length
    );

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error(
      "Get all orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getSingleOrder,
  cancelOrder,
  getAllOrders,
};