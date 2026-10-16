const router = require('express').Router();
const ctrl = require('../controllers/followup.controller');
const validate = require('../middlewares/validate');
const authentication = require('../middlewares/authentication');
const Joi = require('joi');

router.use(authentication);

const listQuery = Joi.object({
  customer_id: Joi.number().integer().positive(),
});

const createBody = Joi.object({
  customer_id: Joi.number().integer().positive().required(),
  summary_id: Joi.number().integer().positive().required(),
  action: Joi.string().valid('contacted', 'no_action').required(),
  outcome: Joi.string().valid('renewed', 'no_response', 'cancelled', 'pending').required(),
  note: Joi.string().max(500).allow('', null),
});

// BARU — taruh SEBELUM route "/" supaya tidak ketabrak urutan matching
router.get('/priority-list', ctrl.priorityList);

router.get('/', validate({ query: listQuery }), ctrl.list);
router.post('/', validate({ body: createBody }), ctrl.create);

module.exports = router;