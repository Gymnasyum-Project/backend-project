const { valid } = require("joi");
const service = require("../services/customer.service");
const attendanceService = require("../services/attendance.service");
const { ok, created } = require("../utils/response");

exports.list = async (req, res) => {
  const result = await service.list(req.validate.query);
  res.json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
};
exports.create = async (req, res, next) => {
  try {
    const customer = await service.create(req.validate.body);

    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
};

exports.detail = async (req, res, next) => {
  const id = Number(req.params.id);
  const result = await service.getDetail(id);
  ok(res, result);
};

exports.update = async (req, res) => {
  const result = await service.update(
    req.validate.params.id,
    req.validate.body,
  );
  ok(res, result);
};

exports.delete = async (req, res, next) => {
  try {
    const id = Number(req.validate?.params?.id);
    await service.delete(id);

    return ok(res, null, "Customer berhasil dihapus");
  } catch (error) {
    next(error);
  }
};

exports.listReschedules = async (req, res) =>
  ok(
    res,
    await attendanceService.listReschedulesByCustomer(req.validate.params.id),
  );
