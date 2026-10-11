const router = require('express').Router();
const ctrl = require('../controllers/predict.controller');
const validate = require('../middlewares/validate');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { predictParams } = require('../validators/predict.validator');

router.use(authenticate);

router.post('/:customerId', validate({ params: predictParams }), ctrl.predict);
router.post('/batch', authorize('admin'), ctrl.batchPredict);

module.exports = router;