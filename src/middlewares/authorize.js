const AppError = require('../utils/AppError');

module.exports = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'Akses ditolak');
  }
  next();
};