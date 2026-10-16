const service = require('../services/followup.service');
const { ok, created } = require('../utils/response');

exports.list = async (req, res) => ok(res, await service.list(req.validate.query.customer_id));

exports.create = async (req, res) =>
  created(res, await service.create(req.validate.body, req.user.id));

// BARU
exports.priorityList = async (req, res) => {
  const result = await service.getPriorityList();
  ok(res, result);
};