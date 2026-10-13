const AppError = require('../utils/AppError')
const prisma = require('../config/prisma')

const RISK_LABEL_MAP = {
    active: 'Active',
    need_attention: 'Need Attention',
    at_risk: 'At Risk'
}
const toDate = (value) => {
    if (value === undefined || value === null || value === '') return undefined
    const d = new Date(value)
    if (isNaN(d.getTime())) {
        throw new AppError(400, 'Bad Request', `Format tanggal tidak valid: ${value}`)
    }
    return d
}

exports.list = async ({ page, limit, search, risk, segment, sort } = {}) => {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100)
    const skip = (pageNum - 1) * limitNum
    console.log({ pageNum, limitNum, search, risk, segment, sort })

    if (risk || sort === 'priority') {
        const riskLabel = risk ? RISK_LABEL_MAP[risk] : null
        if (risk && !riskLabel) {
            throw new AppError(400, 'Bad Request', 'Nilai risk tidak valid')
        }

        const rows = await prisma.$queryRaw`
            SELECT c.*, rp.label AS risk_label, rp.priority_score
            FROM customers c
            LEFT JOIN LATERAL (
                SELECT label, priority_score
                FROM risk_predictions
                WHERE customer_id = c.id
                ORDER BY predicted_at DESC
                LIMIT 1
            ) rp ON true
            WHERE (${riskLabel}::text IS NULL OR rp.label = ${riskLabel}::text)
            ORDER BY rp.priority_score DESC NULLS LAST
            LIMIT ${limitNum} OFFSET ${skip}
        `
        return { items: rows, meta: { page: pageNum, limit: limitNum } }
    }
    
    const where = {
        deleted_at: null, 
        ...(search && { full_name: { contains: search, mode: 'insensitive' } }),
        ...(segment && { segment })
    }

    const [items, total] = await Promise.all([
        prisma.customers.findMany({ where, skip, take: limitNum, orderBy: { full_name: 'asc' } }),
        prisma.customers.count({ where })
    ])

    return {
        items,
        meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    }
}

exports.create = (data)=> prisma.customers.create({data:
    {
        ...data,
        birth_date: toDate(data.birth_date),
        join_date: toDate(data.join_date)
    }
})

exports.getDetail = async (id) => {
  // Gunakan findFirst agar kita bisa memfilter berdasarkan id dan deleted_at sekaligus
  const customer = await prisma.customers.findFirst({
    where: {
      id: Number(id),
      deleted_at: null, // Sekarang ini aman digunakan karena findFirst mendukung filter bebas
    },
    include: {
      customer_packages: { include: { packages: true } },
      attendance: { orderBy: { scheduled_at: 'desc' }, take: 20 },
      risk_predictions: { orderBy: { predicted_at: 'desc' }, take: 1 },
    },
  });

  if (!customer) {
    throw new AppError(404, 'NOT_FOUND', 'Customer tidak ditemukan');
  }

  return customer;
};

exports.update = async (id, data) => {
    await exports.getDetail(id)

    const payload = { ...data }
    if ('birth_date' in payload) payload.birth_date = toDate(payload.birth_date)
    if ('join_date' in payload) payload.join_date = toDate(payload.join_date)

    return prisma.customers.update({ where: { id }, data: payload })
}

exports.delete = async(id)=>{
    await exports.getDetail(id);
    return prisma.customers.update({
        where: {id},
        data: {deleted_at: new Date()},
 });
}