const Joi = require('joi');

exports.idParam = Joi.object({ id: Joi.number().integer().positive().required() });

exports.pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};