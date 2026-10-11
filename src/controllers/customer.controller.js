const { valid } = require('joi');
const service = require('../services/customer.service')
const {ok, created} = require('../utils/response')

exports.list = async(req, res)=>{
    const {items, meta} =await service.list(req.validated?.query || req.query);
    ok(res, items, meta);
} 
exports.create = async (req, res) => {
  const result = await service.create(req.validated?.body || req.body);
  created(res, result);
};

exports.detail = async (req, res,next) => {
    const id = Number(req.params.id);
    const result = await service.getDetail(id);
    ok(res, result);
};

exports.update = async (req, res) => {
  const result = await service.update(req.validated.params.id, req.validated.body);
  ok(res, result);
};

exports.delete = async (req, res, next) => {
  try {
    const id = Number(req.validated?.params?.id || req.params.id);
    await service.delete(id);
    
    return ok(res, null, null, 'Customer berhasil dihapus'); 
  } catch (error) {
    next(error);
  }
};