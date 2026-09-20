const Category = require("../models/Category");

// ==========================================
// CREATE CATEGORY
// ==========================================
const createCategory = async (req, res) => {
  try {
    const {
      name,
      description = "",
      image = "",
      subcategories = [],
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const cleanName = name.trim();

    const existingCategory = await Category.findOne({
      name: {
        $regex: `^${cleanName}$`,
        $options: "i",
      },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    const slug = createSlug(cleanName);

    const existingSlug = await Category.findOne({ slug });

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists",
      });
    }

    const normalizedSubcategories = normalizeSubcategories(
      subcategories
    );

    const category = await Category.create({
      name: cleanName,
      slug,
      description: String(description || "").trim(),
      image: String(image || "").trim(),
      subcategories: normalizedSubcategories,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create Category Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create category",
    });
  }
};

// ==========================================
// GET ALL CATEGORIES
// ==========================================
const getCategories = async (req, res) => {
  try {
    const {
      includeInactive = "false",
      search = "",
    } = req.query;

    const query = {};

    if (includeInactive !== "true") {
      query.isActive = true;
    }

    if (search.trim()) {
      query.name = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };
    }

    const categories = await Category.find(query)
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
};

// ==========================================
// GET CATEGORY BY ID
// ==========================================
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get Category Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

// ==========================================
// UPDATE CATEGORY
// ==========================================
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const {
      name,
      description,
      image,
      subcategories,
      isActive,
    } = req.body;

    // ------------------------------
    // UPDATE NAME
    // ------------------------------
    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty",
        });
      }

      const duplicate = await Category.findOne({
        _id: { $ne: id },
        name: {
          $regex: `^${escapeRegex(cleanName)}$`,
          $options: "i",
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Category already exists",
        });
      }

      category.name = cleanName;
      category.slug = createSlug(cleanName);
    }

    // ------------------------------
    // UPDATE DESCRIPTION
    // ------------------------------
    if (description !== undefined) {
      category.description = String(description).trim();
    }

    // ------------------------------
    // UPDATE IMAGE
    // ------------------------------
    if (image !== undefined) {
      category.image = String(image || "").trim();
    }

    // ------------------------------
    // UPDATE SUBCATEGORIES
    // ------------------------------
    if (subcategories !== undefined) {
      category.subcategories =
        normalizeSubcategories(subcategories);
    }

    // ------------------------------
    // UPDATE STATUS
    // ------------------------------
    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update Category Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update category",
    });
  }
};

// ==========================================
// DELETE CATEGORY
// ==========================================
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete Category Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete category",
    });
  }
};

// ==========================================
// TOGGLE CATEGORY STATUS
// ==========================================
const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = !category.isActive;

    await category.save();

    return res.status(200).json({
      success: true,
      message: category.isActive
        ? "Category activated successfully"
        : "Category deactivated successfully",
      category,
    });
  } catch (error) {
    console.error("Toggle Category Status Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to update category status",
    });
  }
};

// ==========================================
// ADD SUBCATEGORY
// ==========================================
const addSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description = "" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name is required",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const cleanName = name.trim();

    const alreadyExists = category.subcategories.some(
      (subcategory) =>
        subcategory.name.toLowerCase() ===
        cleanName.toLowerCase()
    );

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: "Subcategory already exists",
      });
    }

    category.subcategories.push({
      name: cleanName,
      slug: createSlug(cleanName),
      description: String(description || "").trim(),
      isActive: true,
    });

    await category.save();

    return res.status(201).json({
      success: true,
      message: "Subcategory added successfully",
      category,
    });
  } catch (error) {
    console.error("Add Subcategory Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to add subcategory",
    });
  }
};

// ==========================================
// UPDATE SUBCATEGORY
// ==========================================
const updateSubcategory = async (req, res) => {
  try {
    const { id, subcategoryId } = req.params;
    const {
      name,
      description,
      isActive,
    } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subcategory = category.subcategories.id(
      subcategoryId
    );

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "Subcategory name cannot be empty",
        });
      }

      const duplicate = category.subcategories.some(
        (item) =>
          String(item._id) !== String(subcategoryId) &&
          item.name.toLowerCase() ===
            cleanName.toLowerCase()
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Subcategory already exists",
        });
      }

      subcategory.name = cleanName;
      subcategory.slug = createSlug(cleanName);
    }

    if (description !== undefined) {
      subcategory.description =
        String(description || "").trim();
    }

    if (isActive !== undefined) {
      subcategory.isActive = Boolean(isActive);
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Subcategory updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update Subcategory Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to update subcategory",
    });
  }
};

// ==========================================
// DELETE SUBCATEGORY
// ==========================================
const deleteSubcategory = async (req, res) => {
  try {
    const { id, subcategoryId } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subcategory = category.subcategories.id(
      subcategoryId
    );

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    subcategory.deleteOne();

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
      category,
    });
  } catch (error) {
    console.error("Delete Subcategory Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to delete subcategory",
    });
  }
};

// ==========================================
// HELPERS
// ==========================================
const createSlug = (value) => {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const normalizeSubcategories = (subcategories) => {
  if (!Array.isArray(subcategories)) {
    return [];
  }

  const unique = new Map();

  subcategories.forEach((item) => {
    if (!item) return;

    const name =
      typeof item === "string"
        ? item.trim()
        : String(item.name || "").trim();

    if (!name) return;

    const key = name.toLowerCase();

    if (unique.has(key)) return;

    unique.set(key, {
      name,
      slug: createSlug(name),
      description:
        typeof item === "object"
          ? String(item.description || "").trim()
          : "",
      isActive:
        typeof item === "object" &&
        typeof item.isActive === "boolean"
          ? item.isActive
          : true,
    });
  });

  return Array.from(unique.values());
};

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
};