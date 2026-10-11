const logger = require("../config/logger");
const AppError = require("../utils/AppError");

exports.notFound = (req, res, next) => {
  next(
    new AppError(
      404,
      "NOT_FOUND",
      `Route ${req.method} ${req.originalUrl} tidak ada`,
    ),
  );
};

exports.errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) logger.error({ err, path: req.originalUrl });
  res.status(status).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: status >= 500 ? "Terjadi kesalahan pada server" : err.message,
      ...(err.details && { details: err.details }),
    },
  });
};
