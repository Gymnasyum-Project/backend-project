const prisma = require('../config/prisma');

// Fungsi yang SUDAH ada sebelumnya (untuk followup_logs)
exports.list = (customerId) =>
  prisma.followup_logs.findMany({
    where: customerId ? { customer_id: customerId } : {},
    orderBy: { acted_at: 'desc' },
    include: { customers: { select: { full_name: true } } },
  });

exports.create = (data, userId) =>
  prisma.followup_logs.create({
    data: { ...data, acted_by: userId },
  });

// BARU: untuk halaman Prioritas Follow-up
exports.getPriorityList = async () => {
  const rows = await prisma.$queryRaw`
    SELECT
      c.id,
      c.full_name,
      c.segment,
      c.phone,
      rp.label,
      rp.priority_score,
      cp.remaining_sessions,
      (
        SELECT MAX(scheduled_at)::date
        FROM attendance
        WHERE customer_id = c.id AND status = 'attended'
      ) AS last_visit
    FROM customers c
    INNER JOIN LATERAL (
      SELECT label, priority_score
      FROM risk_predictions
      WHERE customer_id = c.id
      ORDER BY predicted_at DESC
      LIMIT 1
    ) rp ON true
    LEFT JOIN LATERAL (
      SELECT remaining_sessions
      FROM customer_packages
      WHERE customer_id = c.id AND status = 'active'
      ORDER BY start_date DESC
      LIMIT 1
    ) cp ON true
    WHERE c.deleted_at IS NULL
      AND rp.label IN ('At Risk', 'Need Attention')
    ORDER BY
      CASE rp.label WHEN 'At Risk' THEN 1 WHEN 'Need Attention' THEN 2 END,
      rp.priority_score DESC NULLS LAST,
      c.id ASC
  `;

  const atRisk = rows.filter((r) => r.label === "At Risk");
  const needAttention = rows.filter((r) => r.label === "Need Attention");

  return {
    at_risk: atRisk,
    need_attention: needAttention,
    total_at_risk: atRisk.length,
    total_need_attention: needAttention.length,
  };
};