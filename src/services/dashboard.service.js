const { attempt } = require("joi");
const prisma = require("../config/prisma");
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
exports.getSummary = async () => {
  const totalCustomer = await prisma.customers.count();
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const riskPrediction = await prisma.$queryRaw`
        SELECT COALESCE(rp.label, 'Belum Diprediksi') as label, COUNT(*)::int as total FROM customers c
        LEFT JOIN LATERAL(
            SELECT label FROM risk_predictions 
            WHERE customer_id = c.id ORDER BY predicted_at DESC LIMIT 1 
        ) rp ON true 
        GROUP BY rp.label
    `;

  const topPriority = await prisma.$queryRaw`
        SELECT c.*,
            rp.label AS risk_label,
            rp.priority_score,
            cp.remaining_sessions,
            cp.end_date AS package_end_date,
            (SELECT COUNT(*)::int FROM attendance a
            WHERE a.customer_id = c.id
                AND a.status = 'attended'
                AND a.scheduled_at >= ${since}) AS attendance_30d,
            (SELECT MAX(a.scheduled_at) FROM attendance a
            WHERE a.customer_id = c.id
                AND a.status = 'attended') AS last_visit
        FROM customers c
        INNER JOIN LATERAL (
            SELECT label, priority_score
            FROM risk_predictions
            WHERE customer_id = c.id
            ORDER BY predicted_at DESC
            LIMIT 1
        ) rp ON true
        LEFT JOIN LATERAL (
            SELECT remaining_sessions, end_date
            FROM customer_packages
            WHERE customer_id = c.id
            AND status = 'active'
            ORDER BY end_date DESC
            LIMIT 1
        ) cp ON true
        ORDER BY rp.priority_score DESC
        LIMIT 5
    `;

  const anttendanceTrend = await prisma.$queryRaw`
        SELECT DATE_TRUNC('week', scheduled_at) as week, 
            COUNT(*) FILTER (WHERE status = 'attended'):: int as hadir,
            COUNT(*):: int as total
        FROM attendance
        WHERE scheduled_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY week ORDER BY week ASC  
    `;
  return {
    total_customers: totalCustomer,
    risk_predictions: riskPrediction,
    top_priority: topPriority,
    anttendance_trend: anttendanceTrend,
  };
};
