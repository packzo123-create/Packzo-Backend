const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const transporter = require("../config/email");

// ==========================================
// COOKIE OPTIONS
// ==========================================

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

// ==========================================
// GENERATE JWT TOKEN
// ==========================================

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: userId,
      role: "user",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ==========================================
// GENERATE 6-DIGIT OTP
// ==========================================

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==========================================
// SEND VERIFICATION OTP EMAIL
// ==========================================

const sendVerificationEmail = async (email, name, otp) => {
  await transporter.sendMail({
    from: `"Packzo" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your Packzo account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to Packzo, ${name}!</h2>

        <p>Your email verification OTP is:</p>

        <h1 style="letter-spacing: 8px;">${otp}</h1>

        <p>This OTP will expire in 10 minutes.</p>

        <p>
          If you did not create this account, you can ignore this email.
        </p>
      </div>
    `,
  });
};

// ==========================================
// REGISTER USER
// ==========================================

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP();

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || "",
      verificationOTP: otp,
      verificationOTPExpires: new Date(
        Date.now() + 10 * 60 * 1000
      ),
    });

    await sendVerificationEmail(
      user.email,
      user.name,
      otp
    );

    return res.status(201).json({
      success: true,
      message:
        "User registered successfully. Verification OTP sent to your email.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while registering user",
    });
  }
};

// ==========================================
// VERIFY USER EMAIL
// ==========================================

const verifyUserEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    if (
      !user.verificationOTP ||
      !user.verificationOTPExpires ||
      user.verificationOTP !== otp ||
      user.verificationOTPExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    user.isVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify User Email Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while verifying email",
    });
  }
};

// ==========================================
// RESEND VERIFICATION OTP
// ==========================================

const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const otp = generateOTP();

    user.verificationOTP = otp;
    user.verificationOTPExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save();

    await sendVerificationEmail(
      user.email,
      user.name,
      otp
    );

    return res.status(200).json({
      success: true,
      message: "Verification OTP resent successfully",
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while resending OTP",
    });
  }
};

// ==========================================
// LOGIN USER
// ==========================================

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    // ==========================================
    // SAVE JWT IN HTTP-ONLY COOKIE
    // ==========================================

    res.cookie(
      "token",
      token,
      getCookieOptions()
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",

      // Token is intentionally NOT returned.
      // Authentication is handled by HTTP-only cookie.

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while logging in",
    });
  }
};

// ==========================================
// GET CURRENT LOGGED-IN USER
// ==========================================

const getUserProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,

      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        profileImage: req.user.profileImage,
        address: req.user.address,
        isVerified: req.user.isVerified,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error(
      "Get User Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching user profile",
    });
  }
};

// ==========================================
// CHECK AUTH
// ==========================================

const checkAuth = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      isLoggedIn: true,

      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        profileImage: req.user.profileImage,
        address: req.user.address,
        isVerified: req.user.isVerified,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error(
      "Check Auth Error:",
      error
    );

    return res.status(500).json({
      success: false,
      isLoggedIn: false,
      message: "Server error while checking authentication",
    });
  }
};

// ==========================================
// LOGOUT USER
// ==========================================

const logoutUser = async (req, res) => {
  try {
    const options = getCookieOptions();

    res.clearCookie("token", {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error(
      "Logout User Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while logging out",
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  registerUser,
  verifyUserEmail,
  resendVerificationOTP,
  loginUser,
  getUserProfile,
  checkAuth,
  logoutUser,
};