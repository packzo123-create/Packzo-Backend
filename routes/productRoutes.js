const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImages,
} = require("../controllers/productController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// ===============================
// Public Routes
// ===============================

router.get("/", getProducts);

router.get("/:id", getProductById);

// ===============================
// Protected Routes
// ===============================

// Create product
router.post(
  "/",
  protect,
  upload.array("images", 10),
  createProduct
);

// Upload product images
router.post(
  "/upload-images",
  protect,
  upload.array("images", 10),
  uploadProductImages
);

// Update product
router.put(
  "/:id",
  protect,
  upload.array("images", 10),
  updateProduct
);

// Delete product
router.delete("/:id", protect, deleteProduct);

// ===============================
// Upload Error Handler
// ===============================

router.use((error, req, res, next) => {
  console.error("Upload Route Error:", error);

  return res.status(400).json({
    success: false,
    message: error.message || "Image upload failed",
  });
});

module.exports = router;