// src/integrations/rag.client.js
// Pengganti llm.client: antarmukanya sama (generateSummary), tapi memanggil service RAG + Qwen di Modal.
//
// .env backend (dan daftarkan juga di config/env.js):
//   RAG_URL=https://<workspace>--gym-rag-rag-web.modal.run
//   RAG_API_KEY=<sama dengan API_KEY di Modal secret "gym-rag-secret">
const axios = require("axios");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const MODEL_NAME = "qwen2.5-3b-instruct (modal)";
const PROMPT_VERSION = "rag-v1";

// Service RAG hanya menerima tiga label ini persis.
const LABELS = {
  active: "Active",
  need_attention: "Need Attention",
  at_risk: "At Risk",
};

function normalizeLabel(label) {
  const key = String(label ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return LABELS[key] ?? null;
}

exports.generateSummary = async (payload) => {
  if (!env.RAG_URL || !env.RAG_API_KEY) {
    throw new AppError(
      500,
      "CONFIG_ERROR",
      "RAG_URL atau RAG_API_KEY belum diatur",
    );
  }

  const mlLabel = normalizeLabel(payload.risk_label);
  if (!mlLabel) {
    throw new AppError(
      409,
      "INVALID_LABEL",
      `Label risiko tidak dikenali: ${payload.risk_label}`,
    );
  }

  try {
    const { data } = await axios.post(
      `${env.RAG_URL}/followup`,
      {
        customer_id: String(payload.customer_id),
        ml_label: mlLabel,
        features: payload.ringkasan_angka ?? {},
        top_factors: payload.top_factors ?? [], // field tambahan, diabaikan service sampai prompt-nya diperbarui
      },
      {
        headers: { "x-api-key": env.RAG_API_KEY },
        timeout: 180000, // cold start GPU + generasi bisa lama
      },
    );

    return {
      summary: data.answer,
      // null jika model tidak mengikuti format bagian D; jangan isi dengan seluruh jawaban,
      // supaya admin tidak tidak sengaja mengirim analisis internal ke customer.
      draft_whatsapp: data.followup_draft ?? null,
      model_used: MODEL_NAME,
      prompt_version: PROMPT_VERSION,
    };
  } catch (err) {
    console.error(
      "RAG service error:",
      err.response?.status,
      err.response?.data ?? err.message,
    );
    if (err.code === "ECONNABORTED") {
      throw new AppError(
        504,
        "AI_TIMEOUT",
        "Layanan AI terlalu lama merespons, coba lagi",
      );
    }
    throw new AppError(
      502,
      "AI_SERVICE_ERROR",
      "Layanan AI tidak dapat dihubungi",
    );
  }
};
