const router = require('express').Router();
const ctrl = require('../controllers/customer.controller.js')
const predictCtrl = require('../controllers/predict.controller.js')
const validate = require('../middlewares/validate')
const authentication = require('../middlewares/authentication')
const v = require('../validators/customer.validator.js')
const { idParam } = require('../validators/common.validator.js')
const predictValidator = require('../validators/predict.validator.js')

router.use(authentication);

router.get('/', validate(v.list), ctrl.list);
router.post('/', validate(v.create), ctrl.create);
router.get('/:id', validate(v.detailParams), ctrl.detail);
router.patch('/:id', validate(v.update), ctrl.update);
router.delete('/:id', validate(v.detailParams), ctrl.delete);
router.get('/:id/reschedules', validate({ params: idParam }), ctrl.listReschedules)

router.get(
  '/:id/predictions',
  validate({ params: predictValidator.historyParams, query: predictValidator.historyQuery }),
  predictCtrl.history
);

module.exports = router;