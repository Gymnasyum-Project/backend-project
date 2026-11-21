// src/services/aiBatchService.js
const prisma = require("../config/prisma");
const { generateCustomerDraft } = require("./aiSummary.service");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.autoGeneratePriorityDrafts = async ({
  targetLabels = ["At Risk", "Need Attention"],
  delayMs = 800,
} = {}) => {
  const candidates = await prisma.$queryRaw`
    SELECT c.id, c.full_name, rp.label, rp.predicted_at
    FROM customers c
    INNER JOIN LATERAL (
        SELECT label, predicted_at
        FROM risk_predictions
        WHERE customer_id = c.id
        ORDER BY predicted_at DESC
        LIMIT 1
    ) rp ON true
    LEFT JOIN LATERAL (
        SELECT created_at
        FROM ai_summaries
        WHERE customer_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) ai ON true
    WHERE c.deleted_at IS NULL
      AND rp.label = ANY(${targetLabels}::text[])
      AND (ai.created_at IS NULL OR ai.created_at < rp.predicted_at)
    ORDER BY rp.predicted_at DESC
  `;

  console.log(
    `[AI AUTO-DRAFT] Memproses ${candidates.length} customer prioritas...`,
  );

  let successCount = 0;
  let failCount = 0;

  for (const customer of candidates) {
    try {
      await generateCustomerDraft(customer.id);
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
