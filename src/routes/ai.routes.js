const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const validate = require('../middlewares/validate');
const authentication = require('../middlewares/authentication');
const { ai: aiLimiter } = require('../middlewares/rateLimiter');
const {customerParams, generateBody, idParams, updateBody, v} = require('../validators/ai.validator.js');

router.use(authentication);

router.post('/summary/:customerId', aiLimiter, validate({params: customerParams, body: generateBody}), ctrl.generate);
router.patch('/summary/:id', validate({params:idParams, body:updateBody}), ctrl.update);

module.exports = router;