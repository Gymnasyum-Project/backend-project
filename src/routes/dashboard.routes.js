const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const authentication = require('../middlewares/authentication');

router.use(authentication);

router.get('/summary', ctrl.getSummary);

module.exports = router;