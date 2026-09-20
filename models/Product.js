const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    brand: {
      type: String,
      default: "",
    },

    // ==========================================
    // CATEGORY
    // ==========================================

    category: {
      type: String,
      required: true,
      trim: true,
    },

    subcategory: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // PRICING
    // ==========================================

    price: {
      type: Number,
      required: true,
    },

    oldPrice: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // IMAGES
    // ==========================================

    images: [
      {
        type: String,
      },
    ],

    // ==========================================
    // VARIANTS
    // ==========================================

    sizes: [
      {
        type: String,
      },
    ],

    colors: [
      {
        type: String,
      },
    ],

    // ==========================================
    // STOCK
    // ==========================================

    stock: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // RATINGS
    // ==========================================

    rating: {
      type: Number,
      default: 0,
    },

    ratingsCount: {
      type: Number,
      default: 0,
    },

    reviewsCount: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // HIGHLIGHTS
    // ==========================================

    highlights: [
      {
        title: {
          type: String,
          required: true,
        },

        value: {
          type: String,
          required: true,
        },
      },
    ],

    // ==========================================
    // STATUS
    // ==========================================

    isActive: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // ADMIN / SELLER
    // ==========================================

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);