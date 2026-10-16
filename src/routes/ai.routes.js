const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const validate = require('../middlewares/validate');
const authentication = require('../middlewares/authentication');
const { ai: aiLimiter } = require('../middlewares/rateLimiter');
const v = require('../validators/ai.validator.js');

router.use(authentication);

router.post('/summary/:customerId', aiLimiter, validate(v.generate), ctrl.generate);
router.patch('/summary/:id', validate(v.update), ctrl.update);

module.exports = router;