const router = require("express").Router();
const ctrl = require("../controllers/reminder.controller");
const validate = require("../middlewares/validate");
const authentication = require("../middlewares/authentication");
const Joi = require("joi");

router.use(authentication);

const listQuery = Joi.object({
  customer_id: Joi.number().integer().positive().required(),
});

const createBody = Joi.object({
  customer_id: Joi.number().integer().positive().required(),
  channel: Joi.string().valid("whatsapp", "sms", "email").default("whatsapp"),
  sent_at: Joi.date().default(() => new Date()),
  response_status: Joi.string()
    .valid("replied", "read", "no_response")
    .default("no_response"),
});
const idParam = Joi.object({
  id: Joi.number().integer().positive().required(),
});
const updateBody = Joi.object({
  response_status: Joi.string()
    .valid("replied", "read", "no_response")
    .required(),
});

router.get("/", validate({ query: listQuery }), ctrl.listByCustomer);
router.post("/", validate({ body: createBody }), ctrl.create);

router.patch(
  "/:id",
  validate({ params: idParam, body: updateBody }),
  ctrl.update,
);

module.exports = router;
