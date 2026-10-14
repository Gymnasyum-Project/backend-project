const { attempt } = require('joi');
const prisma = require('../config/prisma')

exports.getSummary = async()=>{
    const totalCustomer = await prisma.customers.count();

    const riskDistribution = await prisma.$queryRaw`
        SELECT COALESCE(rp.label, 'Belum Diprediksi') as label, COUNT(*)::int as total FROM customers c
        LEFT JOIN LATERAL(
            SELECT label FROM risk_predictions 
            WHERE customer_id = c.id ORDER BY predicted_at DESC LIMIT 1 
        ) rp ON true 
        GROUP BY rp.label
    `;

    const topPriority = await prisma.$queryRaw`
        SELECT c.id, c.full_name, c.segment, rp.label, rp.priority_score, 
            cp.remaining_sessions,
            (SELECT MAX(scheduled_at)::date FROM attendance
            WHERE customer_id = c.id AND status = 'attended') as last_visit
        FROM customers c
        INNER JOIN LATERAL(
            SELECT label, priority_score FROM risk_predictions
            WHERE customer_id = c.id ORDER BY predicted_at DESC LIMIT 1
        ) rp ON true
        LEFT JOIN customer_packages cp ON cp.customer_id = c.id AND cp.status = 'active'
        ORDER BY rp.priority_score DESC LIMIT 5            
    `;

    const anttendanceTrend = await prisma.$queryRaw`
        SELECT DATE_TRUNC('week', scheduled_at) as week, 
            COUNT(*) FILTER (WHERE status = 'attended'):: int as hadir,
            COUNT(*):: int as total
        FROM attendance
        WHERE scheduled_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY week ORDER BY week ASC  
    `;
    return {total_customers: totalCustomer, risk_distribution: riskDistribution, top_priority:topPriority, anttendance_trend: anttendanceTrend}
}