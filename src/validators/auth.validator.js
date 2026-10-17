const Joi = require('joi');

exports.login = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
};

exports.registrasi = {
  body: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().max(100).required(),
    no_tlp: Joi.string().pattern(/^(\+62|62|0)8[0-9]{8,12}$/).allow(null, '')
          .messages({ 'string.pattern.base': 'Nomor telepon Indonesia tidak valid' }),
    password: Joi.string().min(6).required()   
  })
}