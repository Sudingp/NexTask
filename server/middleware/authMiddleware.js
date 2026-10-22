const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Requires "Authorization: Bearer <token>". Never log the token or the secret:
// hosting logs (e.g. Render) are readable by anyone with dashboard access.
const protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = protect;
