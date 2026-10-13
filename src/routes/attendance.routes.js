const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const validate = require('../middlewares/validate');
const authentication = require('../middlewares/authentication');
const v = require('../validators/attendance.validator');
const {idParam} = require('../validators/common.validator');

router.use(authentication);

router.get('/', validate(v.list), ctrl.list);
router.post('/', validate(v.create), ctrl.created)
router.patch('/:id', validate({params: idParam, ...v.update}), ctrl.updateStatus)
router.post('/:id/reschedule', validate(v.reschedule), ctrl.reschedule)

module.exports = router
