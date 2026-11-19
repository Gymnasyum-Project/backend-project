// src/integrations/llm.client.js
// Kontrak /generate-summary tidak berubah; hanya timeout dan header API key yang ditambahkan.
//
// config/env.js perlu memuat:
//   LLM_SERVICE_URL = https://<workspace>--gym-rag-rag-web.modal.run
//   LLM_API_KEY     = sama dengan API_KEY di Modal secret "gym-rag-secret"
const axios = require("axios");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const http = axios.create({
  baseURL: env.LLM_SERVICE_URL,
  timeout: 180000, // cold start GPU + generasi Qwen bisa puluhan detik sampai menit
  headers: { "x-api-key": env.LLM_API_KEY },
});

exports.generateSummary = async (payload) => {
  try {
    const { data } = await http.post("/generate-summary", payload);
    return {
      summary: data.summary_text,
      draft_whatsapp: data.draft_message, // bisa null jika model tidak mengikuti format
      model_used: data.model_used,
      prompt_version: data.prompt_version,
    };
  } catch (e) {
    console.error(
      "LLM error:",
      e.response?.status,
      e.response?.data ?? e.message,
    );
    if (e.code === "ECONNABORTED") {
      throw new AppError(
        504,
        "LLM_TIMEOUT",
        "Layanan Generative AI terlalu lama merespons, coba lagi",
      );
    }
    throw new AppError(
      502,
      "LLM_UNAVAILABLE",
      "Layanan Generative AI tidak dapat dihubungi",
    );
  }
};
