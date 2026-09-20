const Product = require("../models/Product");

// ==========================================
// NORMALIZE IMAGES
// ==========================================
const normalizeImages = (images) => {
  if (!images) {
    return [];
  }

  let imageList = images;

  // Agar images JSON string ke form mein aaye hain
  if (typeof imageList === "string") {
    const trimmedImages = imageList.trim();

    if (!trimmedImages) {
      return [];
    }

    try {
      const parsedImages = JSON.parse(trimmedImages);

      if (Array.isArray(parsedImages)) {
        imageList = parsedImages;
      } else {
        imageList = [trimmedImages];
      }
    } catch (error) {
      imageList = trimmedImages.includes(",")
        ? trimmedImages.split(",")
        : [trimmedImages];
    }
  }

  if (!Array.isArray(imageList)) {
    imageList = [imageList];
  }

  return imageList
    .flat(Infinity)
    .map((image) => {
      if (typeof image === "string") {
        return image.trim();
      }

      if (image && typeof image === "object") {
        return (
          image.url ||
          image.path ||
          image.secure_url ||
          ""
        ).trim();
      }

      return "";
    })
    .filter(Boolean)
    .filter(
      (image, index, array) =>
        array.indexOf(image) === index
    );
};

// ==========================================
// NORMALIZE ARRAY FIELDS
// ==========================================
const normalizeArray = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .filter(
        (item) =>
          item !== undefined &&
          item !== null &&
          String(item).trim() !== ""
      )
      .map((item) => String(item).trim());
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(trimmedValue);

      if (Array.isArray(parsedValue)) {
        return parsedValue
          .filter(
            (item) =>
              item !== undefined &&
              item !== null &&
              String(item).trim() !== ""
          )
          .map((item) => String(item).trim());
      }
    } catch (error) {
      // Comma-separated values
    }

    return trimmedValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [String(value).trim()];
};

// ==========================================
// NORMALIZE HIGHLIGHTS
// ==========================================
const normalizeHighlights = (value) => {
  if (!value) {
    return [];
  }

  let highlightList = value;

  // FormData se JSON string aa sakti hai
  if (typeof highlightList === "string") {
    const trimmedValue = highlightList.trim();

    if (!trimmedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(trimmedValue);

      if (Array.isArray(parsedValue)) {
        highlightList = parsedValue;
      } else {
        return [];
      }
    } catch (error) {
      console.error(
        "Highlights JSON Parse Error:",
        error.message
      );

      return [];
    }
  }

  if (!Array.isArray(highlightList)) {
    return [];
  }

  return highlightList
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        String(item.title || "").trim() !== "" &&
        String(item.value || "").trim() !== ""
    )
    .map((item) => ({
      title: String(item.title).trim(),
      value: String(item.value).trim(),
    }));
};

// ==========================================
// ESCAPE REGEX
// ==========================================
const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

// ==========================================
// CREATE PRODUCT
// ==========================================
const createProduct = async (req, res) => {
  try {
    console.log("========== CREATE PRODUCT ==========");
    console.log("Request body:", req.body);
    console.log(
      "Uploaded files:",
      req.files?.length || 0
    );

    const {
      name,
      description,
      brand,
      category,
      subcategory,
      price,
      oldPrice,
      discount,
      sizes,
      colors,
      stock,
      highlights,
    } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================
    if (
      !name ||
      String(name).trim() === "" ||
      !category ||
      String(category).trim() === "" ||
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, category and price are required",
      });
    }

    // ==========================================
    // ONLY CLOUDINARY FILE URLS
    // ==========================================
    const finalImages = (req.files || [])
      .map((file) => {
        return (
          file.path ||
          file.secure_url ||
          file.url ||
          ""
        );
      })
      .filter((imageUrl) => {
        return (
          imageUrl &&
          !imageUrl.startsWith("data:image/")
        );
      });

    console.log(
      "Final Cloudinary Images:",
      finalImages
    );

    // ==========================================
    // IMAGE REQUIRED
    // ==========================================
    if (finalImages.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload at least one image through Cloudinary",
      });
    }

    // ==========================================
    // CREATE PRODUCT
    // ==========================================
    const product = await Product.create({
      name: String(name).trim(),

      description: description
        ? String(description).trim()
        : "",

      brand: brand
        ? String(brand).trim()
        : "",

      category: String(category).trim(),

      subcategory: subcategory
        ? String(subcategory).trim()
        : "",

      price: Number(price),

      oldPrice:
        oldPrice !== undefined && oldPrice !== ""
          ? Number(oldPrice)
          : 0,

      discount:
        discount !== undefined && discount !== ""
          ? Number(discount)
          : 0,

      images: finalImages,

      sizes: normalizeArray(sizes),

      colors: normalizeArray(colors),

      stock:
        stock !== undefined && stock !== ""
          ? Number(stock)
          : 0,

      // IMPORTANT:
      // Highlights are objects:
      // [{ title: "...", value: "..." }]
      highlights: normalizeHighlights(highlights),

      seller: req.admin?._id,
    });

    console.log(
      "Product created successfully:",
      product._id
    );

    console.log(
      "Saved images:",
      product.images
    );

    console.log(
      "Saved highlights:",
      product.highlights
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error(
      "Create Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET PRODUCTS
// SEARCH + CATEGORY + SUBCATEGORY
// + PRICE FILTER + PAGINATION
// ==========================================
const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      subcategory,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      isActive: true,
    };

    // ==========================================
    // SEARCH
    // ==========================================
    if (search && search.trim()) {
      const searchValue = escapeRegex(
        search.trim()
      );

      query.$or = [
        {
          name: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          description: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          category: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          subcategory: {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    // ==========================================
    // CATEGORY FILTER
    // ==========================================
    if (category && category.trim()) {
      query.category = {
        $regex: `^${escapeRegex(
          category.trim()
        )}$`,
        $options: "i",
      };
    }

    // ==========================================
    // SUBCATEGORY FILTER
    // ==========================================
    if (subcategory && subcategory.trim()) {
      query.subcategory = {
        $regex: `^${escapeRegex(
          subcategory.trim()
        )}$`,
        $options: "i",
      };
    }

    // ==========================================
    // PRICE FILTER
    // ==========================================
    if (minPrice || maxPrice) {
      query.price = {};

      if (
        minPrice !== undefined &&
        minPrice !== ""
      ) {
        query.price.$gte = Number(minPrice);
      }

      if (
        maxPrice !== undefined &&
        maxPrice !== ""
      ) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // ==========================================
    // PAGINATION
    // ==========================================
    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const productsLimit = Math.max(
      Number(limit) || 10,
      1
    );

    const skip =
      (currentPage - 1) * productsLimit;

    const totalProducts =
      await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate("seller", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(productsLimit);

    const totalPages = Math.ceil(
      totalProducts / productsLimit
    );

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        totalProducts,
        totalPages,
        currentPage,
        productsPerPage: productsLimit,
        hasNextPage:
          currentPage < totalPages,
        hasPreviousPage:
          currentPage > 1,
      },
    });
  } catch (error) {
    console.error(
      "Get Products Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET SINGLE PRODUCT
// ==========================================
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(
      req.params.id
    ).populate("seller", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(
      "Get Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPLOAD PRODUCT IMAGES
// ==========================================
const uploadProductImages = async (req, res) => {
  try {
    if (
      !req.files ||
      req.files.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload at least one image",
      });
    }

    const imageUrls = req.files
      .map(
        (file) =>
          file.path ||
          file.secure_url ||
          file.url ||
          ""
      )
      .filter(Boolean);

    if (imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Images uploaded but no valid image URLs found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Images uploaded successfully",
      images: imageUrls,
    });
  } catch (error) {
    console.error(
      "Upload Images Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE PRODUCT
// ==========================================
const updateProduct = async (req, res) => {
  try {
    console.log(
      "========== UPDATE PRODUCT =========="
    );

    console.log(
      "Product ID:",
      req.params.id
    );

    console.log(
      "Request body:",
      req.body
    );

    console.log(
      "Uploaded files:",
      req.files?.length || 0
    );

    // ==========================================
    // FIND PRODUCT
    // ==========================================
    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ==========================================
    // OWNERSHIP CHECK
    // ==========================================
    if (
      product.seller &&
      req.admin?._id &&
      product.seller.toString() !==
        req.admin._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this product",
      });
    }

    // ==========================================
    // ALLOWED FIELDS
    // ==========================================
    const allowedFields = [
      "name",
      "description",
      "brand",
      "category",
      "subcategory",
      "price",
      "oldPrice",
      "discount",
      "images",
      "sizes",
      "colors",
      "stock",
      "highlights",
      "rating",
      "ratingsCount",
      "reviewsCount",
      "isActive",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // ==========================================
    // NORMALIZE IMAGES
    // ==========================================
    if (req.body.images !== undefined) {
      updateData.images = normalizeImages(
        req.body.images
      );
    }

    // ==========================================
    // ADD NEW CLOUDINARY FILES
    // ==========================================
    if (
      req.files &&
      req.files.length > 0
    ) {
      const uploadedImages = req.files
        .map(
          (file) =>
            file.path ||
            file.secure_url ||
            file.url ||
            ""
        )
        .filter(Boolean);

      updateData.images = normalizeImages([
        ...(updateData.images || []),
        ...uploadedImages,
      ]);
    }

    // ==========================================
    // NORMALIZE ARRAY FIELDS
    // ==========================================
    if (req.body.sizes !== undefined) {
      updateData.sizes = normalizeArray(
        req.body.sizes
      );
    }

    if (req.body.colors !== undefined) {
      updateData.colors = normalizeArray(
        req.body.colors
      );
    }

    // ==========================================
    // NORMALIZE HIGHLIGHTS
    // ==========================================
    if (
      req.body.highlights !== undefined
    ) {
      updateData.highlights =
        normalizeHighlights(
          req.body.highlights
        );
    }

    // ==========================================
    // NORMALIZE STRING FIELDS
    // ==========================================
    if (updateData.name !== undefined) {
      updateData.name = String(
        updateData.name
      ).trim();
    }

    if (
      updateData.description !== undefined
    ) {
      updateData.description = String(
        updateData.description
      ).trim();
    }

    if (updateData.brand !== undefined) {
      updateData.brand = String(
        updateData.brand
      ).trim();
    }

    if (
      updateData.category !== undefined
    ) {
      updateData.category = String(
        updateData.category
      ).trim();
    }

    if (
      updateData.subcategory !== undefined
    ) {
      updateData.subcategory = String(
        updateData.subcategory
      ).trim();
    }

    // ==========================================
    // CONVERT NUMERIC FIELDS
    // ==========================================
    [
      "price",
      "oldPrice",
      "discount",
      "stock",
      "rating",
      "ratingsCount",
      "reviewsCount",
    ].forEach((field) => {
      if (
        updateData[field] !== undefined &&
        updateData[field] !== ""
      ) {
        updateData[field] = Number(
          updateData[field]
        );
      }
    });

    // ==========================================
    // BOOLEAN FIELD
    // ==========================================
    if (updateData.isActive !== undefined) {
      if (
        updateData.isActive === "true"
      ) {
        updateData.isActive = true;
      }

      if (
        updateData.isActive === "false"
      ) {
        updateData.isActive = false;
      }
    }

    // ==========================================
    // UPDATE DATABASE
    // ==========================================
    const updatedProduct =
      await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log(
      "Product updated successfully:",
      updatedProduct._id
    );

    console.log(
      "Updated images:",
      updatedProduct.images
    );

    console.log(
      "Updated highlights:",
      updatedProduct.highlights
    );

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(
      "Update Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE PRODUCT
// ==========================================
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ==========================================
    // OWNERSHIP CHECK
    // ==========================================
    if (
      product.seller &&
      req.admin?._id &&
      product.seller.toString() !==
        req.admin._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this product",
      });
    }

    await Product.findByIdAndDelete(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
  createProduct,
  getProducts,
  getProductById,
  uploadProductImages,
  updateProduct,
  deleteProduct,
};