const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const authenticate = require('../middlewares/authentication');
const { auth: authLimiter } = require('../middlewares/rateLimiter');
const v = require('../validators/auth.validator');

router.post('/login', authLimiter, validate(v.login), ctrl.login);
router.post('/registrasi', validate(v.registrasi), ctrl.registrasi)
router.get('/me', authenticate, ctrl.me);   
router.post('/logout', authenticate, ctrl.logout)

module.exports = router;