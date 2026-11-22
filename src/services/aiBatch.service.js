const prisma = require("../config/prisma");
const aiSummaryService = require("./aiSummary.service");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.autoGeneratePriorityDrafts = async ({
  targetLabels = ["At Risk", "Need Attention"],
  delayMs = 1500, // jeda 1.5 detik sudah cukup aman untuk Modal
  limit = 15, // batasi per eksekusi cron agar tidak melebihi batas waktu Vercel
} = {}) => {
  // Cari customer prioritas yang prediction_id terbarunya belum punya ai_summary aktif
  const candidates = await prisma.$queryRaw`
    SELECT c.id, c.full_name, rp.id AS prediction_id, rp.label, rp.priority_score
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
    ORDER BY rp.priority_score DESC NULLS LAST, rp.predicted_at DESC
    LIMIT ${limit}
  `;

  console.log(
    `[AI AUTO-DRAFT] Memproses ${candidates.length} customer prioritas...`,
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
      // userId = null (karena digenerate oleh sistem/cron), regenerate = false
      await aiSummaryService.generate(Number(customer.id), systemUser.id, {
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

  return {
    processed: candidates.length,
    successCount,
    failCount,
  };
};
