const Joi = require('joi');

exports.featureSchema = Joi.object({
  attendance_rate_30d: Joi.number().min(0).max(1).required(),
  missed_count_30d: Joi.number().integer().min(0).required(),
  reschedule_count_30d: Joi.number().integer().min(0).required(),
  remaining_sessions: Joi.number().integer().min(0).required(),
  remaining_ratio: Joi.number().min(0).max(1).required(),
  days_since_last_visit: Joi.number().integer().min(0).required(),
  reminder_response_rate: Joi.number().min(0).max(1).required(),
});

exports.predictParams = Joi.object({
  customerId: Joi.number().integer().positive().required(),
});