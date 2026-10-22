const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const publicUser = (user, token) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  token,
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" });
    }
    if (!EMAIL_RE.test(String(email))) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (String(password).length < MIN_PASSWORD) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      username: String(username).trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json(publicUser(user, signToken(user._id)));
  } catch (error) {
    console.error("REGISTER ERROR:", error.message);
    return res.status(500).json({ message: "Could not create account" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    const ok = user && (await bcrypt.compare(String(password), user.password));
    // Same message whether the email or the password is wrong, so the API
    // doesn't reveal which emails have accounts.
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json(publicUser(user, signToken(user._id)));
  } catch (error) {
    console.error("LOGIN ERROR:", error.message);
    return res.status(500).json({ message: "Could not log in" });
  }
});

module.exports = router;
