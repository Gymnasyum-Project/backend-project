const router = require('express').Router();
const ctrl = require('../controllers/predict.controller');
const validate = require('../middlewares/validate');
const authentication = require('../middlewares/authentication');
const authorize = require('../middlewares/authorize');
const { predictParams, historyQuery } = require('../validators/predict.validator');

router.use(authentication);

router.post('/batch', authorize('admin'), ctrl.batchPredict);
router.post('/:customerId', validate({ params: predictParams }), ctrl.predict);
router.get(
  '/:customerId/history',
  validate({ params: predictParams, query: historyQuery }),
  ctrl.history
);

module.exports = router;