const rateLimit = require("express-rate-limit");

exports.general = rateLimit({ windowMs: 60_000, limit: 120 });
exports.auth = rateLimit({ windowMs: 15 * 60_000, limit: 10 });
exports.ai = rateLimit({ windowMs: 60_000, limit: 10 });
