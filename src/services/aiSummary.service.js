const prisma = require("../config/prisma");
const rag = require("../integrations/rag.client");
const AppError = require("../utils/AppError");

const extractDraftWhatsapp = (summaryText, customerName = null) => {
  if (!summaryText) return null;

  // Tangkap bagian D sampai sebelum bagian E (mendukung heading ### maupun **...** serta tanda hubung Unicode)
  const match = summaryText.match(
    /(?:###|\*\*)\s*D\.\s*WhatsApp Follow[-\u2010-\u2015]Up Draft\s*(?:\*\*)?\s*\n+([\s\S]*?)(?=\n+(?:---|\s*(?:###|\*\*)\s*E\.))/i,
  );

  if (!match || !match[1]) return null;

  let cleaned = match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*>\s*/, "").trim())
    .filter((line) => !/^\*\*(Greeting|Isi\s*pesan|Closing)\*\*:?$/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned) return null;

  if (customerName) {
    cleaned = cleaned.replace(/\[Nama Customer\]/gi, customerName);
  }

  return cleaned;
};

const generateInternal = async (
  customerId,
  userId,
  { regenerate = false } = {},
) => {
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
    customer_id: customerId, // hanya identitas, tidak dipakai sebagai indikator
    customer_name: prediction.customers.full_name,
    segmen: prediction.customers.segment,
    risk_label: prediction.label,
    top_factors: prediction.top_factors ?? [],
    features: prediction.features ?? {},
  };
  const result = await rag.generateSummary(payload);
  if (!result?.summary) {
    throw new AppError(
      502,
      "LLM_EMPTY_RESPONSE",
      "Layanan AI tidak mengembalikan ringkasan",
    );
  }

  const resolvedDraft =
    result.draft_whatsapp ??
    extractDraftWhatsapp(result.summary, prediction.customers.full_name);

  return prisma.$transaction(async (tx) => {
    if (regenerate) {
      await tx.ai_summaries.updateMany({
        where: { prediction_id: prediction.id, status: { not: "discarded" } },
        data: { status: "discarded" },
      });
    }
    return tx.ai_summaries.create({
      data: {
        customers: { connect: { id: Number(customerId) } },
        risk_predictions: { connect: { id: Number(prediction.id) } },
        summary: result.summary,
        followup_draft: resolvedDraft,
        llm_model: result.model_used ?? "unknown",
        prompt_version: result.prompt_version ?? "v1",
        status: "draft",
        ...(userId !== null &&
          userId !== undefined && {
            users: { connect: { id: Number(userId) } },
          }),
      },
    });
  });
};

const inFlight = new Map();

exports.generate = (customerId, userId, opts = {}) => {
  const key = `${customerId}:${opts.regenerate ? "regen" : "normal"}`;
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = generateInternal(customerId, userId, opts).finally(() =>
    inFlight.delete(key),
  );
  inFlight.set(key, promise);
  return promise;
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

exports.getDraftFollowUp = async (customerId) => {
  const row = await prisma.ai_summaries.findFirst({
    where: {
      customer_id: Number(customerId),
      status: { not: "discarded" },
      OR: [{ followup_draft: { not: null } }, { edited_draft: { not: null } }],
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      customer_id: true,
      status: true,
      followup_draft: true,
      edited_draft: true,
      created_at: true,
    },
  });
  if (!row) return null;

  const { edited_draft, ...rest } = row;
  return { ...rest, followup_draft: edited_draft ?? row.followup_draft };
};
