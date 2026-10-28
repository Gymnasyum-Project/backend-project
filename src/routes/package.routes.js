const router = require("express").Router();
const ctrl = require("../controllers/package.controller.js");
const validate = require("../middlewares/validate");
const authentication = require("../middlewares/authentication");
const v = require("../validators/packages.validator.js");
const { idParam } = require("../validators/common.validator.js");

router.use(authentication);

router.get("/", (req, res, next) => {
  if (req.baseUrl.endsWith("/customer-packages"))
    return ctrl.listCustomerPackages(req, res, next);
  return ctrl.list(req, res, next);
});

router.post("/", (req, res, next) => {
  if (req.baseUrl.endsWith("/customer-packages")) {
    return validate(v.assignToCustomer)(req, res, (err) => {
      if (err) return next(err);
      return ctrl.assignToCustomer(req, res, next);
    });
  }
  return validate(v.createPackage)(req, res, (err) => {
    if (err) return next(err);
    return ctrl.createPackage(req, res, next);
  });
});
router.get("/:id", validate({ params: idParam }), (req, res, next) => {
  if (req.baseUrl.endsWith("/customer-packages"))
    return ctrl.getCustomerPackage(req, res, next);
  return ctrl.getPackageById(req, res, next);
});
router.patch(
  "/:id",
  validate(v.updateCustomerPackage),
  ctrl.updateCustomerPackage,
);

module.exports = router;
