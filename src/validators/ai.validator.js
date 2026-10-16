const { join } = require('@prisma/client/runtime/client')
const Joi = require('joi')

exports.customerParams= Joi.object({customerId: Joi.number().integer().positive().required()})

exports.generateBody = Joi.object({regenerate: Joi.boolean().default(false)})

exports.idParams = Joi.object({id: Joi.number().integer().positive().required()})

exports.updateBody = Joi.object({
    edited_draft: Joi.string().max(2000),
    status: Joi.string().valid('draft', 'approved', 'sent')
}).min(1);