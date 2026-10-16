const service = require('../services/prediction.service');
const { ok } = require('../utils/response');

exports.predict = async (req, res) => {
  const result = await service.predictCustomer(req.validate.params.customerId);
  ok(res, result);
};

exports.batchPredict = async (req, res) => {
  const results = await service.batchPredict();
  ok(res, { total: results.length });
};

exports.history = async(req, res)=>{
  const {id} = req.validate.params;
  const {limit}= req.validate.query;
  const result = await service.getHistory(id, limit)
  ok(res, result)
}