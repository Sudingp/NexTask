const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");
require("dotenv").config();

// 🔥 Fix DNS issue (important for your case)
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);

// 🔥 MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:");
    console.error(error.message);
    process.exit(1);
  }
};

// Call DB connection
connectDB();

// Test route
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

// DB test route
app.get("/test-db", async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    res.json({
      message: "✅ DB is working",
      collections: collections.map((c) => c.name),
    });
  } catch (err) {
    res.status(500).json({
      message: "❌ DB error",
      error: err.message,
    });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});