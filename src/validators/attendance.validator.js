const Joi = require("joi");
const { idParam } = require("./common.validator");

const STATUS = ["attended", "missed", "rescheduled"];
const customerIdRule = Joi.string()
  .trim()
  .pattern(/^CUST\d{5}$/)
  .required()
  .messages({
    "string.pattern.base": "Format customer_id harus seperti CUST00001",
  });

exports.list = {
  query: Joi.object({
    customer_id: customerIdRule,
  }),
};

exports.create = {
  body: Joi.object({
    customer_id: customerIdRule,
    customer_package_id: Joi.number().integer().positive().required(),
    scheduled_at: Joi.date().required(),
    status: Joi.string()
      .valid(...STATUS)
      .default("attended"),
    checkin_at: Joi.string().allow(null, ""),
    coach_name: Joi.string().max(100).allow(null, ""),
  }),
};

exports.update = {
  params: idParam,
  body: Joi.object({
    status: Joi.string()
      .valid(...STATUS)
      .required(),
    checkin_at: Joi.date().allow(null),
  }),
};

exports.reschedule = {
  params: idParam,
  body: Joi.object({
    visited_at: Joi.date().iso().max("now").required(),
    coach_name: Joi.string().max(100).allow("", null),
    reason: Joi.string().max(255).allow("", null),
  }),
};

exports.pendingReschedules = {
  query: Joi.object({
    customer_id: customerIdRule,
  }),
};
