const Joi = require("joi");
const { idParam } = require("./common.validator");

const SERVICES = ["gym", "private_coaching"];
const STATUS = ["active", "completed", "expired"];
const PACKAGE_STATUS = ["active", "inactive"];

exports.createPackage = {
  body: Joi.object({
    name: Joi.string().trim().max(100).allow("").required(),
    service_type: Joi.string()
      .valid(...SERVICES)
      .required(),
    total_sessions: Joi.number().integer().min(1).required(),
    duration_days: Joi.number().integer().min(1).required(),
    price: Joi.number().min(0).required(),
    status: Joi.string().valid(...PACKAGE_STATUS),
  }),
};
exports.updatePackage = {
  params: idParam,
  body: Joi.object({
    status: Joi.string().valid(...PACKAGE_STATUS),
  }).min(1),
};
exports.assignToCustomer = {
  body: Joi.object({
    customer_id: Joi.number().integer().positive().required(),
    package_id: Joi.number().integer().positive().required(),
    start_date: Joi.date().required(),
  }),
};

exports.updateCustomerPackage = {
  params: idParam,
  body: Joi.object({
    remaining_sessions: Joi.number().integer().min(0),
    status: Joi.string().valid(...STATUS),
  }).min(1),
};
exports.listPackages = {
  query: Joi.object({ status: Joi.string().valid("active", "inactive") }),
};
