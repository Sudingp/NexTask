const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // 🔍 DEBUG: show full header
  console.log("Authorization Header:", req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token
      token = req.headers.authorization.split(" ")[1];

      // 🔍 DEBUG
      console.log("Token:", token);
      console.log("JWT_SECRET:", process.env.JWT_SECRET);

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🔍 DEBUG
      console.log("Decoded:", decoded);

      // Fetch user from DB
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        console.log("User not found in DB");
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;

      next();

    } catch (error) {
      console.error("JWT ERROR:", error.message);
      return res.status(401).json({ message: "Not authorized" });
    }
  } else {
    console.log("No Authorization header or wrong format");
    return res.status(401).json({ message: "No token provided" });
  }
};

module.exports = protect;