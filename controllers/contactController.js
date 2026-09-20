const ContactMessage = require("../models/ContactMessage");

const createContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Your message has been sent successfully",
      contactMessage,
    });
  } catch (error) {
    console.error("Contact message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

const getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Get contact messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact messages",
    });
  }
};

module.exports = {
  createContactMessage,
  getContactMessages,
};