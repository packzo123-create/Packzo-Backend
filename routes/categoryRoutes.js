const express = require("express");

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
} = require("../controllers/categoryController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// CATEGORY ROUTES
// ==========================================

// Public
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin protected
router.post("/", protect, createCategory);
router.put("/:id", protect, updateCategory);
router.delete("/:id", protect, deleteCategory);
router.patch("/:id/status", protect, toggleCategoryStatus);

// ==========================================
// SUBCATEGORY ROUTES
// ==========================================

router.post(
  "/:id/subcategories",
  protect,
  addSubcategory
);

router.put(
  "/:id/subcategories/:subcategoryId",
  protect,
  updateSubcategory
);

router.delete(
  "/:id/subcategories/:subcategoryId",
  protect,
  deleteSubcategory
);

module.exports = router;