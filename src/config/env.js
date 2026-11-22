const Joi = require("joi");
require("dotenv").config();

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(4000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default("8h"),
  INFERENCE_URL: Joi.string().uri().required(),

  // Ubah LLM_SERVICE_URL jadi opsional jika sudah migrasi ke RAG_URL
  LLM_SERVICE_URL: Joi.string().uri().optional().allow(""),

  // Daftarkan konfigurasi RAG Modal & Webhook Internal
  RAG_URL: Joi.string().uri().required(),
  RAG_API_KEY: Joi.string().min(1).required(),
  INTERNAL_WEBHOOK_SECRET: Joi.string().min(1).optional(),
  CRON_SECRET: Joi.string().min(1).optional().allow(""),

  CORS_ORIGIN: Joi.string().default("http://localhost:5173"),
}).unknown();

const { value, error } = schema.validate(process.env, { abortEarly: false });
if (error) throw new Error(`Env tidak valid: ${error.message}`);

module.exports = value;
