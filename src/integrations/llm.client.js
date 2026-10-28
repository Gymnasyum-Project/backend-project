const axios = require("axios");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const http = axios.create({ baseURL: env.LLM_SERVICE_URL, timeout: 15000 });

exports.generateSummary = async (payload) => {
  try {
    const { data } = await http.post("/generate-summary", payload);
    return {
      summary: data.summary_text,
      draft_whatsapp: data.draft_message,
      model_used: data.model_used,
      prompt_version: data.prompt_version,
    };
  } catch (e) {
    console.error("LLM error:", e.message);
    throw new AppError(
      502,
      "LLM_UNAVAILABLE",
      "Layanan Generative AI tidak dapat dihubungi",
    );
  }
};
