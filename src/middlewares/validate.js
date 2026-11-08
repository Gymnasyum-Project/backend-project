const AppError = require("../utils/AppError");

module.exports = (schemas) => (req, res, next) => {
  req.validate = {};
  for (const part of ["params", "query", "body"]) {
    if (!schemas[part]) continue;

    const { value, error } = schemas[part].validate(req[part], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));
      return next(
        new AppError(422, "VALIDATION_ERROR", "INPUT TIDAK VALID", details),
      );
    }
    req.validate[part] = value;
  }
  next();
};
