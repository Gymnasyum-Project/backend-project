const service = require('../services/reminder.service');
const { ok, created } = require('../utils/response');

exports.listByCustomer = async (req, res) => ok(res, await service.listByCustomer(req.validate.query.customer_id));
exports.create = async (req, res) => created(res, await service.create(req.validate.body));