const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/packages', require('./package.routes'));
router.use('/customer-packages', require('./package.routes'));
router.use('/reminders', require('./reminder.routes'));
// router.use('/predict', require('./predict.routes'));
// router.use('/ai', require('./ai.routes'));
// router.use('/followups', require('./followup.routes'));

module.exports = router;