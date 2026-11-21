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

  const mlLabel = normalizeLabel(payload.risk_label ?? payload.label);
  if (!mlLabel) {
    throw new AppError(
      409,
      "INVALID_LABEL",
      `Label risiko tidak dikenali: ${payload.risk_label}`,
    );
  }
  const rawFeatures = payload.ringkasan_angka ?? payload.features ?? {};
  const features =
    rawFeatures &&
    typeof rawFeatures === "object" &&
    !Array.isArray(rawFeatures) &&
    Object.keys(rawFeatures).length > 0
      ? rawFeatures
      : { customer_id: Number(payload.customer_id) };
  try {
    const { data } = await axios.post(
      `${env.RAG_URL}/followup`,
      {
        customer_id: String(payload.customer_id),
        ml_label: mlLabel,
        features,
        top_factors: payload.top_factors ?? [], // field tambahan, diabaikan service sampai prompt-nya diperbarui
      },
      {
        headers: { "x-api-key": env.RAG_API_KEY },
        timeout: 180000, // cold start GPU + generasi bisa lama
      },
    );
    const summaryText = data.summary ?? data.ringkasan ?? data.answer ?? null;

    // Ekstrak khusus bagian "### D. WhatsApp Follow-Up Draft" sebelum "### E."
    let extractedDraft = null;
    if (summaryText && summaryText.includes("### D.")) {
      const partD = summaryText.split("### D.")[1]?.split("### E.")[0];
      if (partD) {
        extractedDraft = partD
          .replace(/^.*WhatsApp Follow-Up Draft.*\n?/i, "") // hapus judul bagian D
          .replace(/\*\*(Greeting|Isi Pesan|Closing):\*\*\n?/gi, "") // hapus label sub-bagian
          .trim();
      }
    }

    // Ganti placeholder [Nama Customer] dengan nama asli customer jika tersedia
    if (extractedDraft && payload.customer_name) {
      extractedDraft = extractedDraft.replace(
        /\[Nama Customer\]/gi,
        payload.customer_name,
      );
    }

    return {
      summary: summaryText,
      draft_whatsapp: extractedDraft,
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
