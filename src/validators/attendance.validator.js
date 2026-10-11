const Joi = require('joi');
const {idParam} = require('./common.validator')

const STATUS = ['attendance', 'missed', 'rescheduled', 'cancelled'];

exports.list = {
    query: Joi.object({
        customer_id: Joi.number().integer().positive().required(),
    }),
}

exports.create = {
    body: Joi.object({
        customer_id: Joi.number().integer().positive().required(),
        customer_package_id: Joi.number().integer().positive().required(),
        scheduled_at: Joi.date().required(),
        status: Joi.string().valid(...STATUS).default('attendance'),
        coach_name:Joi.string().max(100).allow(null, '')
    })
}

exports.update = {
    params: idParam,
    body: Joi.object({
        status: Joi.string().valid(...STATUS).required(),
        checkin_at: Joi.date().allow(null)
    })
}

exports.reschedule = {
    params: idParam, 
    body: Joi.object({
        new_schedule: Joi.date().required(),
        reason: Joi.string().max(500).allow('', null),
    })
}