const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const validate = require('../middlewares/validate');
const authenticate = require('../middlewares/authenticate');
const { ai: aiLimiter } = require('../middlewares/rateLimiter');
const v = require('../validators/ai.validator');

router.use(authenticate);

router.post('/summary/:customerId', aiLimiter, validate(v.generate), ctrl.generate);
router.patch('/summary/:id', validate(v.update), ctrl.update);

module.exports = router;