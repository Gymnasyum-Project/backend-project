const service = require('../services/model.service');
const { ok } = require('../utils/response');

exports.list = async (req, res) => {
  const result = await service.listVersions();
  ok(res, result);
};