const { join } = require("@prisma/client/runtime/client");
const Joi = require("joi");

exports.customerParams = Joi.object({
  customerId: Joi.string()
    .trim()
    .pattern(/^CUST\d{5}$/)
    .required()
    .messages({
      "string.pattern.base": "Format customer_id harus seperti CUST00001",
    }),
});

exports.generateBody = Joi.object({
  regenerate: Joi.boolean().default(false),
}).default({});

exports.idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

exports.updateBody = Joi.object({
  edited_draft: Joi.string().max(2000),
  status: Joi.string().valid("draft", "approved", "sent"),
}).min(1);
