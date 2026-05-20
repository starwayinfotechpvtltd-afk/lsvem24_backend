//JWT Token
const jwt = require("jsonwebtoken");

//import model
const Admin = require("../models/admin.model");

module.exports = async (req, res, next) => {
  try {
    const Authorization = req.get("Authorization");
    if (!Authorization) {
      return res.status(401).json({ status: false, message: "Oops ! You are not authorized." });
    }

    const decodeToken = await jwt.verify(Authorization, process?.env?.JWT_SECRET);
    if (!decodeToken || !decodeToken._id) {
      return res.status(401).json({ status: false, message: "Invalid token. Authorization failed." });
    }

    const admin = await Admin.findById(decodeToken._id);
    if (!admin) {
      return res.status(401).json({ status: false, message: "Admin not found. Authorization failed." });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ status: false, message: "Invalid or expired token. Authorization failed." });
    }

    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
