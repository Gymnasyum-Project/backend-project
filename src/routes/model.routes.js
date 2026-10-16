const router = require('express').Router();
const ctrl = require('../controllers/model.controller');
const authentication = require('../middlewares/authentication');

router.use(authentication);
router.get('/', ctrl.list);

module.exports = router;