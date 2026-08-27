require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const sendVerificationEmail = require("./utils/sendEmail");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    passwordHash: { type: String, required: true },

    emailVerified: { type: Boolean, default: false },

    verificationCode: { type: String },

    verificationExpires: { type: Date }
  },
  { timestamps: true }
);

const codeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    language: { type: String, required: true, trim: true },
    category: { type: String, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 500 },
    code: { type: String, required: true, maxlength: 100000 }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Code = mongoose.model("Code", codeSchema);

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Please log in." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    console.log("REGISTER EMAIL:", normalizedEmail);
    console.log("EXISTING USER:", !!existing);

    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Code expires after 10 minutes
    const verificationExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
      verificationCode,
      verificationExpires
    });

    // Send verification email
    await sendVerificationEmail(
      user.email,
      verificationCode
    );

    res.status(201).json({
      message: "Account created. A verification code has been sent to your email.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Could not create the account."
    });
  }
});
// Verify Email
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        message: "Email and verification code are required."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified."
      });
    }

    if (!user.verificationCode || !user.verificationExpires) {
      return res.status(400).json({
        message: "No verification code found. Please register again."
      });
    }

    if (new Date() > user.verificationExpires) {
      return res.status(400).json({
        message: "Verification code has expired. Please register again."
      });
    }

    if (code.toString().trim() !== user.verificationCode) {
      return res.status(400).json({
        message: "Invalid verification code."
      });
    }

    user.emailVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;

    await user.save();

    res.json({
      message: "Email verified successfully."
    });

  } catch (error) {
    console.error("Email verification error:", error);

    res.status(500).json({
      message: "Could not verify email."
    });
  }
});
// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: (email || "").toLowerCase().trim() });

    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not log in." });
  }
});

// Current user
app.get("/api/auth/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).select("_id name email createdAt");
  if (!user) return res.status(404).json({ message: "User not found." });

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  });
});

// Get user's codes
app.get("/api/codes", auth, async (req, res) => {
  const codes = await Code.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(codes);
});

// Add code
app.post("/api/codes", auth, async (req, res) => {
  try {
    const { title, language, category, description, code } = req.body;

    if (!title || !language || !code) {
      return res.status(400).json({ message: "Title, language and code are required." });
    }

    const saved = await Code.create({
      userId: req.userId,
      title,
      language,
      category: category || "",
      description: description || "",
      code
    });

    res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not save the code." });
  }
});

// Update code
app.put("/api/codes/:id", auth, async (req, res) => {
  try {
    const { title, language, category, description, code } = req.body;

    const updated = await Code.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title, language, category: category || "", description: description || "", code },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Code not found." });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update the code." });
  }
});

// Delete code
app.delete("/api/codes/:id", auth, async (req, res) => {
  const deleted = await Code.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId
  });

  if (!deleted) return res.status(404).json({ message: "Code not found." });

  res.json({ message: "Code deleted." });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error("Missing MONGODB_URI or JWT_SECRET in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");
    app.listen(PORT, () => {
      console.log(`CodeVault running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

start();
