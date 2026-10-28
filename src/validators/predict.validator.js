const Joi = require("joi");

exports.featureSchema = Joi.object({
  attendance_frequency_7d: Joi.number().integer().min(0).required(),
  missed_session_count_7d: Joi.number().integer().min(0).required(),
  reschedule_frequency_7d: Joi.number().integer().min(0).required(),
  remaining_package_sessions: Joi.number().integer().min(0).required(),
  days_until_package_expiry: Joi.number().integer().min(0).required(),
  days_since_last_visit: Joi.number().integer().min(0).required(),
  reminder_count_7d: Joi.number().integer().min(0).required(),
  reminder_response_count_7d: Joi.number().integer().min(0).required(),
});

exports.predictParams = Joi.object({
  customerId: Joi.number().integer().positive().required(),
});

exports.historyParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

exports.historyQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
});
