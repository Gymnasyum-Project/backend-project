const prisma = require("../config/prisma");
const aiSummaryService = require("./aiSummary.service");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.autoGeneratePriorityDrafts = async ({
  targetLabels = ["At Risk", "Need Attention"],
  delayMs = 2000, // jeda 2 detik agar aman dari batas TPM Groq
  limit = 10, // total 10 data (5 per label) agar aman dari timeout Vercel
} = {}) => {
  const perLabelLimit = Math.max(1, Math.floor(limit / targetLabels.length));

  // Ambil 5 skor tertinggi untuk masing-masing label (At Risk & Need Attention)
  const candidates = await prisma.$queryRaw`
    WITH ranked_candidates AS (
      SELECT
        c.id,
        c.full_name,
        rp.id AS prediction_id,
        rp.label,
        rp.priority_score,
        ROW_NUMBER() OVER (
          PARTITION BY rp.label
          ORDER BY rp.priority_score DESC NULLS LAST, rp.predicted_at DESC
        ) AS rn
      FROM customers c
      INNER JOIN LATERAL (
          SELECT id, label, predicted_at, priority_score
          FROM risk_predictions
          WHERE customer_id = c.id
          ORDER BY predicted_at DESC
          LIMIT 1
      ) rp ON true
      LEFT JOIN ai_summaries ai
        ON ai.prediction_id = rp.id
        AND ai.status != 'discarded'
      WHERE c.deleted_at IS NULL
        AND rp.label = ANY(${targetLabels}::text[])
        AND ai.id IS NULL
    )
    SELECT id, full_name, prediction_id, label, priority_score
    FROM ranked_candidates
    WHERE rn <= ${perLabelLimit}
    ORDER BY priority_score DESC NULLS LAST, id ASC
  `;

  console.log(
    `[AI AUTO-DRAFT] Memproses ${candidates.length} customer prioritas (maks ${perLabelLimit} per label)...`,
  );

  let successCount = 0;
  let failCount = 0;
  const systemUser = await prisma.users.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!systemUser) {
    throw new Error("Tidak ada data user di database untuk mengisi created_by");
  }

  for (const customer of candidates) {
    try {
      await aiSummaryService.generate(Number(customer.id), systemUser.id, {
        regenerate: false,
      });
      successCount++;
    } catch (err) {
      failCount++;
      console.error(
        `[AI AUTO-DRAFT] Gagal pada customer #${customer.id} (${customer.label}):`,
        err.message,
      );
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  console.log(
    `[AI AUTO-DRAFT] Selesai. Sukses: ${successCount}, Gagal: ${failCount}.`,
  );

  return {
    processed: candidates.length,
    successCount,
    failCount,
  };
};
