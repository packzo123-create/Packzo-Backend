const Order = require("../models/Order");

// Get all orders
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email phone")
      .populate("items.product", "title price images")
      .sort({ createdAt: -1 });

    console.log("TOTAL ORDERS IN DATABASE:", orders.length);
    console.log("ORDERS DATA:", orders);

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// Get single order by ID
const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate("items.product", "title price images");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Update order status and payment status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const allowedOrderStatuses = [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    const allowedPaymentStatuses = ["Pending", "Paid"];

    if (
      orderStatus &&
      !allowedOrderStatuses.includes(orderStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    if (
      paymentStatus &&
      !allowedPaymentStatuses.includes(paymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("items.product", "title price images");

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};