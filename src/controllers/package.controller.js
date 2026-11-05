const service = require("../services/package.service");
const { ok, created } = require("../utils/response");
const svc = require("../services/package.service");

exports.list = async (req, res) => {
  const data = await svc.list(req.query.status);
  ok(res, data);
};

exports.createPackage = async (req, res) =>
  created(res, await service.createPackage(req.validate.body));
exports.update = async (req, res) => {
  const data = await svc.update(req.validate.params.id, req.validate.body);
  res.json({ success: true, data });
};
exports.listCustomerPackages = async (req, res) =>
  ok(res, await service.listCustomerPackages());

exports.assignToCustomer = async (req, res) =>
  created(res, await service.assignToCustomer(req.validate.body));

exports.getCustomerPackage = async (req, res) =>
  ok(res, await service.getCustomerPackage(req.validate.params.id));

exports.getPackageById = async (req, res) => {
  ok(res, await service.getPackageById(req.validate.params.id));
};

exports.updateCustomerPackage = async (req, res) =>
  ok(
    res,
    await service.updateCustomerPackage(
      req.validate.params.id,
      req.validate.body,
    ),
  );
