const service = require('../services/dashboard.service');
const { ok } = require('../utils/response');

exports.getSummary = async (req, res) => {
  const result = await service.getSummary();
  ok(res, result);
};