// Express app, separate from server.js so tests can import it without
// connecting to MongoDB or opening a port.
const express = require("express");
const cors = require("cors");
const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Only the deployed frontend (and localhost in development) may call the API.
// CLIENT_ORIGIN can hold several origins, comma-separated.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, Postman, health checks) are allowed.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => res.send("NexTask API is running"));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// Unknown routes
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Malformed JSON bodies and anything unexpected
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  console.error("UNHANDLED ERROR:", err.message);
  return res.status(500).json({ message: "Server error" });
});

module.exports = app;
