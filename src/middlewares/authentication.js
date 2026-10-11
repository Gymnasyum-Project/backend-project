const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("../utils/AppError");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) throw new AppError(401, "UNAUTHORIZED", "Token tidak ditemukan");
  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Token tidak valid atau kedaluwarsa",
    );
  }
};
