const router = require("express").Router();
const ctrl = require("../controllers/package.controller.js");
const validate = require("../middlewares/validate");
const authentication = require("../middlewares/authentication");
const v = require("../validators/packages.validator.js");
const { idParam } = require("../validators/common.validator.js");
const authorize = require("../middlewares/authorize");

router.use(authentication);

// Memilih fungsi berdasarkan router dipasang di /packages atau /customer-packages.
// Hasil pemanggilan DIKEMBALIKAN, jadi promise dari controller async tetap
// ditangkap Express 5 dan error-nya masuk ke error handler.
const byBase = (forPackage, forCustomerPackage) => (req, res, next) =>
  (req.baseUrl.endsWith("/customer-packages")
    ? forCustomerPackage
    : forPackage)(req, res, next);

router.get("/", byBase(ctrl.list, ctrl.listCustomerPackages));

router.post(
  "/",
  byBase(validate(v.createPackage), validate(v.assignToCustomer)),
  byBase(ctrl.createPackage, ctrl.assignToCustomer),
);

router.get(
  "/:id",
  validate({ params: idParam }),
  byBase(ctrl.getPackageById, ctrl.getCustomerPackage),
);

router.patch(
  "/:id",
  authorize("admin"),
  byBase(validate(v.updatePackage), validate(v.updateCustomerPackage)),
  byBase(ctrl.update, ctrl.updateCustomerPackage),
);

module.exports = router;
