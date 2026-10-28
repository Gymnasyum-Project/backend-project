const prisma = require("../config/prisma");
const llm = require("../integrations/llm.client");
const AppError = require("../utils/AppError");

exports.generate = async (customerId, userId, { regenerate = false } = {}) => {
  const prediction = await prisma.risk_predictions.findFirst({
    where: { customer_id: customerId },
    orderBy: { predicted_at: "desc" },
    include: { customers: true },
  });
  if (!prediction)
    throw new AppError(
      409,
      "NO_PREDICTION",
      "Jalankan prediksi risiko terlebih dahulu",
    );

  if (!regenerate) {
    const cached = await prisma.ai_summaries.findFirst({
      where: { prediction_id: prediction.id, status: { not: "discarded" } },
      orderBy: { created_at: "desc" },
    });
    if (cached) return cached;
  }

  const payload = {
    nama_panggilan: prediction.customers.full_name,
    segmen: prediction.customers.segment,
    risk_label: prediction.label,
    top_factors: prediction.top_factors,
    ringkasan_angka: prediction.features,
  };

  const result = await llm.generateSummary(payload);
  console.log("HASIL LLM:", result);
  return prisma.$transaction(async (tx) => {
    if (regenerate) {
      await tx.ai_summaries.updateMany({
        where: { prediction_id: prediction.id, status: { not: "discarded" } },
        data: { status: "discarded" },
      });
    }
    return tx.ai_summaries.create({
      data: {
        customer_id: customerId,
        prediction_id: prediction.id,
        summary: result.summary,
        followup_draft: result.draft_whatsapp,
        llm_model: result.model_used ?? "unknown",
        prompt_version: result.prompt_version ?? "v1",
        status: "draft",
        created_by: userId,
      },
    });
  });
};

const ALLOWED_STATUS = ["draft", "approved", "discarded"];

exports.updateSummary = async (id, { edited_draft, status }) => {
  const existing = await prisma.ai_summaries.findUnique({ where: { id } });
  if (!existing)
    throw new AppError(404, "NOT_FOUND", "Summary tidak ditemukan");

  if (status !== undefined && !ALLOWED_STATUS.includes(status)) {
    throw new AppError(400, "INVALID_STATUS", "Status tidak valid");
  }

  return prisma.ai_summaries.update({
    where: { id },
    data: {
      ...(edited_draft !== undefined && { edited_draft }),
      ...(status !== undefined && { status }),
    },
  });
};
