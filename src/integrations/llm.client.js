const axios = require("axios");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const http = axios.create({
  baseURL: env.RAG_URL,
  timeout: 180000,
  headers: { "x-api-key": env.RAG_API_KEY },
});

exports.generateSummary = async (payload) => {
  try {
    const normalizedPayload = {
      customer_id: String(payload.customer_id),
      customer_name: payload.nama_panggilan || payload.customer_name || null,
      label: payload.risk_label || payload.label || null,
      features: payload.ringkasan_angka || payload.features || {},
    };

    const { data } = await http.post("/generate-summary", normalizedPayload);

    const fullText = data.summary_text || data.summary || data.ringkasan || "";
    let extractedDraft = data.draft_message || null;
    if (!extractedDraft && fullText.includes("### D.")) {
      const partD = fullText.split("### D.")[1]?.split("### E.")[0];
      if (partD) extractedDraft = partD.trim();
    }

    return {
      summary: fullText,
      draft_whatsapp: extractedDraft,
      model_used: data.model_used || "qwen/qwen3.8-27b",
      prompt_version: data.prompt_version || "v1",
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
