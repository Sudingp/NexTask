require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const app = require("./app");

// Prefer IPv4 when resolving the Atlas hostname (fixes connection errors on some networks).
dns.setDefaultResultOrder("ipv4first");

for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy server/.env.example to server/.env and fill it in.`);
    process.exit(1);
  }
}

// Render (and most hosts) tell the app which port to use.
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
