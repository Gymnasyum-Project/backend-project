const Joi = require("joi");
const { pagination, idParam } = require("./common.validator");

const SEGMENTS = ["ibu_ibu", "lansia", "menengah_atas", "lainnya"];
const SERVICES = ["gym", "private_coaching"];

exports.list = {
  query: Joi.object({
    ...pagination,
    search: Joi.string().trim().max(100).allow(""),
    risk: Joi.string().valid("active", "need_attention", "at_risk"),
    segment: Joi.string().valid(...SEGMENTS),
    sort: Joi.string()
      .valid("priority", "name", "join_date")
      .default("priority"),
  }),
};

exports.create = {
  body: Joi.object({
    full_name: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string()
      .pattern(/^(\+62|62|0)8[0-9]{8,12}$/)
      .allow(null, "")
      .messages({
        "string.pattern.base": "Nomor telepon Indonesia tidak valid",
      }),
    email: Joi.string().email().allow(null, ""),
    gender: Joi.string().valid("female", "male").allow(null),
    birth_date: Joi.date().max("now").allow(null),
    segment: Joi.string()
      .valid(...SEGMENTS)
      .required(),
    service_type: Joi.string()
      .valid(...SERVICES)
      .required(),
    join_date: Joi.date().default(() => new Date()),
    notes: Joi.string().allow("", null).max(1000),
  }),
};

exports.update = {
  params: idParam,
  body: Joi.object({
    full_name: Joi.string().trim().min(2).max(100),
    phone: Joi.string()
      .pattern(/^(\+62|62|0)8[0-9]{8,12}$/)
      .allow(null, "")
      .messages({
        "string.pattern.base": "Nomor telepon Indonesia tidak valid",
      }),
    email: Joi.string().email().allow(null, ""),
    gender: Joi.string().valid("female", "male").allow(null),
    birth_date: Joi.date().max("now").allow(null),
    join_date: Joi.date(),
    segment: Joi.string().valid(...SEGMENTS),
    service_type: Joi.string().valid(...SERVICES),
    notes: Joi.string().allow("", null).max(1000),
  }).min(1),
};

exports.detailParams = { params: idParam };
