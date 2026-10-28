const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");
const { custom } = require("joi");

const RISK_LABEL_MAP = {
  active: "Active",
  need_attention: "Need Attention",
  at_risk: "At Risk",
};
const toDate = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new AppError(
      400,
      "Bad Request",
      `Format tanggal tidak valid: ${value}`,
    );
  }
  return d;
};
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const countOf = (rows, key, value) =>
  rows.find((r) => r[key] === value)?._count._all ?? 0;

const buildStats = async (customerId) => {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [attendanceRows, lastVisit, activePackage, reminderRows] =
    await Promise.all([
      prisma.attendance.groupBy({
        by: ["status"],
        where: { customer_id: customerId, scheduled_at: { gte: since } },
        _count: { _all: true },
      }),
      prisma.attendance.findFirst({
        where: { customer_id: customerId, status: "attended" },
        orderBy: { scheduled_at: "desc" },
        select: { scheduled_at: true },
      }),
      prisma.customer_packages.findFirst({
        where: { customer_id: customerId, status: "active" },
        orderBy: { start_date: "desc" },
        select: { remaining_sessions: true, end_date: true },
      }),
      prisma.reminders.groupBy({
        by: ["response_status"],
        where: { customer_id: customerId, sent_at: { gte: since } },
        _count: { _all: true },
      }),
    ]);

  const attended = countOf(attendanceRows, "status", "attended");
  const missed = countOf(attendanceRows, "status", "missed");
  const rescheduled = countOf(attendanceRows, "status", "rescheduled");

  return {
    attendance_30d: attended, // Frekuensi Hadir (30 hr)
    missed_30d: missed, // Sesi Terlewat
    total_sessions_30d: attended + missed, // "dari 8 sesi"
    reschedule_30d: rescheduled, // Reschedule
    remaining_sessions: activePackage?.remaining_sessions ?? null, // Sisa Paket
    last_visit: lastVisit?.scheduled_at ?? null,
    days_since_last_visit: lastVisit // Hari Sejak Kunjungan
      ? Math.floor((Date.now() - new Date(lastVisit.scheduled_at)) / DAY_MS)
      : null,
    reminder_total_30d: reminderRows.reduce((sum, r) => sum + r._count._all, 0), // penyebut "1/3"
    reminder_responded_30d: countOf(reminderRows, "response_status", "replied"), // pembilang "1/3"
  };
};

exports.list = async ({ page, limit, search, risk, segment, sort } = {}) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNum - 1) * limitNum;
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  if (risk || sort === "priority") {
    const riskLabel = risk ? RISK_LABEL_MAP[risk] : null;
    if (risk && !riskLabel) {
      throw new AppError(400, "Bad Request", "Nilai risk tidak valid");
    }

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw`
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
                LEFT JOIN LATERAL (
                    SELECT label, priority_score
                    FROM risk_predictions
                    WHERE customer_id = c.id
                    ORDER BY predicted_at DESC
                    LIMIT 1
                ) rp ON true
                LEFT JOIN LATERAL (
                    SELECT remaining_sessions, end_date
                    FROM customer_packages
                    WHERE customer_id = c.id AND status = 'active'
                    ORDER BY start_date DESC
                    LIMIT 1
                ) cp ON true
                WHERE c.deleted_at IS NULL
                AND (${riskLabel}::text IS NULL OR rp.label = ${riskLabel}::text)
                AND (${search ?? null}::text IS NULL OR c.full_name ILIKE '%' || ${search ?? null}::text || '%')
                AND (${segment ?? null}::text IS NULL OR c.segment = ${segment ?? null}::text)
                ORDER BY rp.priority_score DESC NULLS LAST, c.id ASC
                LIMIT ${limitNum} OFFSET ${skip}
            `,
      // total data dengan filter yang sama, tanpa LIMIT/OFFSET
      prisma.$queryRaw`
                SELECT COUNT(*)::int AS total
                FROM customers c
                LEFT JOIN LATERAL (
                    SELECT label
                    FROM risk_predictions
                    WHERE customer_id = c.id
                    ORDER BY predicted_at DESC
                    LIMIT 1
                ) rp ON true
                WHERE c.deleted_at IS NULL
                AND (${riskLabel}::text IS NULL OR rp.label = ${riskLabel}::text)
                AND (${search ?? null}::text IS NULL OR c.full_name ILIKE '%' || ${search ?? null}::text || '%')
                AND (${segment ?? null}::text IS NULL OR c.segment = ${segment ?? null}::text)
            `,
    ]);

    const total = countRows[0].total;
    return {
      items: rows,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  const where = {
    deleted_at: null,
    ...(search && { full_name: { contains: search, mode: "insensitive" } }),
    ...(segment && { segment }),
  };

  const [customers, total] = await Promise.all([
    prisma.customers.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { full_name: "asc" },
    }),
    prisma.customers.count({ where }),
  ]);

  const ids = customers.map((c) => c.id);

  const [counts, packages, lastVisits] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["customer_id"],
      where: {
        customer_id: { in: ids },
        status: "attended",
        scheduled_at: { gte: since },
      },
      _count: { _all: true },
    }),
    prisma.customer_packages.findMany({
      where: { customer_id: { in: ids }, status: "active" },
      orderBy: { start_date: "desc" },
      select: { customer_id: true, remaining_sessions: true, end_date: true },
    }),
    prisma.attendance.groupBy({
      by: ["customer_id"],
      where: { customer_id: { in: ids }, status: "attended" },
      _max: { scheduled_at: true },
    }),
  ]);

  const countMap = new Map(counts.map((r) => [r.customer_id, r._count._all]));
  const lastVisitMap = new Map(
    lastVisits.map((r) => [r.customer_id, r._max.scheduled_at]),
  );

  // hasil sudah urut start_date terbaru, jadi yang pertama muncul per customer = paket terbaru
  const packageMap = new Map();
  for (const p of packages) {
    if (!packageMap.has(p.customer_id)) packageMap.set(p.customer_id, p);
  }

  const items = customers.map((c) => ({
    ...c,
    attendance_30d: countMap.get(c.id) ?? 0,
    last_visit: lastVisitMap.get(c.id) ?? null,
    remaining_sessions: packageMap.get(c.id)?.remaining_sessions ?? null,
    package_end_date: packageMap.get(c.id)?.end_date ?? null,
  }));

  return {
    items,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

const assertCustomerExists = async (id) => {
  const exists = await prisma.customers.findFirst({
    where: { id: Number(id), deleted_at: null },
    select: { id: true },
  });
  if (!exists) {
    throw new AppError(404, "NOT_FOUND", "Customer tidak ditemukan");
  }
};
const assertEmailAvailable = async (email, excludedId) => {
  if (!email) return;
  const existing = await prisma.customers.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      deleted_at: null,
      ...(excludedId && { NOT: { id: Number(excludedId) } }),
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, "EMAIL_ALREADY_USED", "Email sudah terdaftar");
  }
};

exports.create = async (data) => {
  const email = data.email?.trim().toLowerCase();
  await assertEmailAvailable(email);
  prisma.customers.create({
    data: {
      ...data,
      ...(email && { email }),
      birth_date: toDate(data.birth_date),
      join_date: toDate(data.join_date),
    },
  });
};

exports.getDetail = async (id) => {
  const customer = await prisma.customers.findFirst({
    where: {
      id: Number(id),
      deleted_at: null,
    },
    include: {
      customer_packages: { include: { packages: true } },
      attendance: { orderBy: { scheduled_at: "desc" }, take: 20 },
      risk_predictions: { orderBy: { predicted_at: "desc" }, take: 1 },
    },
  });

  if (!customer) {
    throw new AppError(404, "NOT_FOUND", "Customer tidak ditemukan");
  }

  const [stats, rescheduleRows] = await Promise.all([
    buildStats(customer.id),
    prisma.reschedules.findMany({
      where: { attendance: { customer_id: customer.id } },
      orderBy: { requested_at: "desc" },
      take: 20,
      select: {
        id: true,
        old_schedule: true,
        new_schedule: true,
        reason: true,
        requested_at: true,
        attendance: { select: { customer_package_id: true } },
      },
    }),
  ]);
  const packageName = new Map(
    customer.customer_packages.map((cp) => [cp.id, cp.packages?.name ?? null]),
  );
  const reschedules = rescheduleRows.map(({ attendance, ...r }) => ({
    ...r,
    package_name: packageName.get(attendance.customer_package_id) ?? null,
  }));

  const ai_summary = await prisma.ai_summaries.findFirst({
    where: { customer_id: customer.id },
    orderBy: { created_at: "desc" },
  });

  return { ...customer, reschedules, ai_summary, stats };
};

exports.update = async (id, data) => {
  await assertCustomerExists(id);

  const payload = { ...data };
  if ("birth_date" in payload) payload.birth_date = toDate(payload.birth_date);
  if ("join_date" in payload) payload.join_date = toDate(payload.join_date);

  if (payload.email) {
    payload.email = payload.email.trim().toLowerCase();
    await assertEmailAvailable(payload.email, id);
  }
  return prisma.customers.update({ where: { id }, data: payload });
};

exports.delete = async (id) => {
  await assertCustomerExists(id);
  return prisma.customers.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
};
