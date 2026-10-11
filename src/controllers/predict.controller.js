const service = require('../services/prediction.service');
const { ok } = require('../utils/response');

exports.predict = async (req, res) => {
  const result = await service.predictCustomer(req.validated.params.customerId);
  ok(res, result);
};

exports.batchPredict = async (req, res) => {
  const results = await service.batchPredict();
  ok(res, { total: results.length });
};