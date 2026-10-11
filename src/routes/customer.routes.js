const router = require('express').Router();
const ctrl = require('../controllers/customer.controller.js')
const validate = require('../middlewares/validate')
const authentication = require('../middlewares/authentication')
const v = require('../validators/customer.validator.js')

router.use(authentication);

router.get('/', validate(v.list), ctrl.list);
router.post('/', validate(v.create), ctrl.create);
router.get('/:id', validate(v.detailParams), ctrl.detail);
router.patch('/:id', validate(v.update), ctrl.update);
router.delete('/:id', validate(v.detailParams), ctrl.delete);

module.exports = router;