const prisma = require("../config/prisma");
const aiSummaryService = require("./aiSummary.service");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.autoGeneratePriorityDrafts = async ({
  targetLabels = ["At Risk", "Need Attention"],
  delayMs = 2500, // Jeda 2.5 detik agar aman dari rate limit LLM
} = {}) => {
  // Cari customer prioritas yang prediction_id terbarunya belum punya ai_summary aktif
  const candidates = await prisma.$queryRaw`
    SELECT c.id, c.full_name, rp.id AS prediction_id, rp.label
    FROM customers c
    INNER JOIN LATERAL (
        SELECT id, label, predicted_at
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
    ORDER BY rp.predicted_at DESC
  `;

  console.log(
    `[AI AUTO-DRAFT] Memproses ${candidates.length} customer prioritas...`,
  );

  let successCount = 0;
  let failCount = 0;

  for (const customer of candidates) {
    try {
      // userId = null (karena digenerate oleh sistem/cron), regenerate = false
      await aiSummaryService.generate(Number(customer.id), null, {
        regenerate: false,
      });
      successCount++;
    } catch (err) {
      failCount++;
      console.error(
        `[AI AUTO-DRAFT] Gagal pada customer #${customer.id}:`,
        err.message,
      );
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  console.log(
    `[AI AUTO-DRAFT] Selesai. Sukses: ${successCount}, Gagal: ${failCount}.`,
  );

  return { total: candidates.length, successCount, failCount };
};
