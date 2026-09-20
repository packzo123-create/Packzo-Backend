const express = require("express");

const {
  createContactMessage,
  getContactMessages,
} = require("../controllers/contactController");

const router = express.Router();

// Customer contact form
router.post("/", createContactMessage);

// Admin contact messages
router.get("/", getContactMessages);

module.exports = router;