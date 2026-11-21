const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");
const { syncExpiredPackages } = require("../utils/syncPackages"); // 1. Import helper

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

const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;
const SEVEN_DAYS_MS = 7 * DAY_MS;

const countOf = (rows, key, value) =>
  rows.find((r) => r[key] === value)?._count._all ?? 0;

const buildStats = async (customerId) => {
  const since = new Date(Date.now() - SEVEN_DAYS_MS);

  const [attendanceRows, lastVisit, activePackage, reminderRows] =
    await Promise.all([
      prisma.attendance.groupBy({
        by: ["status"],
        where: { customer_id: customerId, scheduled_at: { gte: since } },
        _count: { _all: true },
      }),
      prisma.attendance.findFirst({
        where: {
          customer_id: customerId,
          status: "attended",
          OR: [{ scheduled_at: { not: null } }, { checkin_at: { not: null } }],
        },
        orderBy: [{ scheduled_at: "desc" }, { id: "desc" }],
        select: { scheduled_at: true, checkin_at: true },
      }),
      prisma.customer_packages.findFirst({
        where: {
          customer_id: customerId,
          status: "active",
          end_date: { gte: new Date() },
        },
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
  const lastVisitAt = lastVisit?.checkin_at ?? lastVisit?.scheduled_at ?? null;

  return {
    attendance_7d: attended,
    missed_7d: missed,
    total_sessions_7d: attended + missed,
    reschedule_7d: rescheduled,
    remaining_sessions: activePackage?.remaining_sessions ?? null,
    last_visit: lastVisitAt,
    days_since_last_visit: lastVisitAt
      ? Math.floor((Date.now() - new Date(lastVisitAt)) / DAY_MS)
      : null,
    reminder_total_7d: reminderRows.reduce((sum, r) => sum + r._count._all, 0),
    reminder_responded_7d: countOf(reminderRows, "response_status", "replied"),
  };
};

exports.list = async ({ page, limit, search, risk, segment, sort } = {}) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;
  const since = new Date(Date.now() - SEVEN_DAYS_MS);
  const searchTerm = search?.trim() || null;

  const riskLabel = risk ? RISK_LABEL_MAP[risk] : null;
  if (risk && !riskLabel) {
    throw new AppError(400, "Bad Request", "Nilai risk tidak valid");
  }

  const orderByClause =
    sort === "name"
      ? Prisma.sql`c.full_name ASC, c.id ASC`
      : sort === "join_date"
        ? Prisma.sql`c.join_date DESC NULLS LAST, c.id ASC`
        : Prisma.sql`rp.priority_score DESC NULLS LAST, c.id ASC`;

  const [rows, countRows, tabCountRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT c.*,
          rp.label AS risk_label,
          rp.priority_score,
          cp.remaining_sessions,
          cp.end_date AS package_end_date,
          (SELECT COUNT(*)::int FROM attendance a
              WHERE a.customer_id = c.id
              AND a.status = 'attended'
              AND a.scheduled_at >= ${since}) AS attendance_7d,
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
          WHERE customer_id = c.id 
            AND status = 'active'
            AND end_date >= NOW()
          ORDER BY start_date DESC
          LIMIT 1 
      ) cp ON true
      WHERE c.deleted_at IS NULL
      AND (${riskLabel}::text IS NULL OR rp.label = ${riskLabel}::text)
      AND (${segment ?? null}::text IS NULL OR c.segment = ${segment ?? null}::text)
      AND (
        ${searchTerm}::text IS NULL
        OR c.full_name ILIKE '%' || ${searchTerm}::text || '%'
        OR c.phone ILIKE '%' || ${searchTerm}::text || '%'
        OR c.email ILIKE '%' || ${searchTerm}::text || '%'
        OR ('CUST' || LPAD(c.id::text, 5, '0')) ILIKE '%' || ${searchTerm}::text || '%'
      )
      ORDER BY ${orderByClause}
      LIMIT ${limitNum} OFFSET ${skip}
    `,

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
      AND (${segment ?? null}::text IS NULL OR c.segment = ${segment ?? null}::text)
      AND (
        ${searchTerm}::text IS NULL
        OR c.full_name ILIKE '%' || ${searchTerm}::text || '%'
        OR c.phone ILIKE '%' || ${searchTerm}::text || '%'
        OR c.email ILIKE '%' || ${searchTerm}::text || '%'
        OR ('CUST' || LPAD(c.id::text, 5, '0')) ILIKE '%' || ${searchTerm}::text || '%'
      )
    `,

    prisma.$queryRaw`
      SELECT rp.label, COUNT(*)::int AS total
      FROM customers c
      LEFT JOIN LATERAL (
          SELECT label
          FROM risk_predictions
          WHERE customer_id = c.id
          ORDER BY predicted_at DESC
          LIMIT 1
      ) rp ON true
      WHERE c.deleted_at IS NULL
      GROUP BY rp.label
    `,
  ]);

  const counts = {
    all: 0,
    at_risk: 0,
    need_attention: 0,
    active: 0,
  };

  for (const row of tabCountRows) {
    counts.all += row.total;
    if (row.label === "At Risk") counts.at_risk = row.total;
    else if (row.label === "Need Attention") counts.need_attention = row.total;
    else if (row.label === "Active") counts.active = row.total;
  }

  const total = countRows[0].total;

  return {
    items: rows,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasMore: skip + rows.length < total,
      counts,
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

exports.create = async ({ package_id, ...customerData }) => {
  return prisma.$transaction(async (tx) => {
    const pkg = await tx.packages.findUnique({
      where: { id: Number(package_id) },
    });
    if (!pkg)
      throw new AppError(404, "NOT_FOUND", "Master Paket Tidak Ditemukan");

    const customer = await tx.customers.create({
      data: {
        full_name: customerData.full_name,
        phone: customerData.phone,
        email: customerData.email,
        birth_date: new Date(customerData.birth_date),
        segment: customerData.segment,
        join_date: new Date(customerData.join_date),
        notes: customerData.notes || null,
        service_type: pkg.service_type ?? pkg.name.slice(0, 20),
      },
    });

    const start = new Date(customerData.join_date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + pkg.duration_days);

    await tx.customer_packages.create({
      data: {
        customer_id: customer.id,
        package_id: pkg.id,
        start_date: start,
        end_date: end,
        total_sessions: pkg.total_sessions,
        remaining_sessions: pkg.total_sessions,
        // 4. Cek langsung apakah end_date sudah terlewati
        status: end < new Date() ? "expired" : "active",
      },
    });

    return customer;
  });
};

exports.getDetail = async (id) => {
  const customerId = Number(id);
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  await syncExpiredPackages(customerId);

  const customer = await prisma.customers.findFirst({
    where: {
      id: customerId,
      deleted_at: null,
    },
    include: {
      customer_packages: { include: { packages: true } },
      attendance: {
        where: { scheduled_at: { gte: sevenDaysAgo } },
        orderBy: { scheduled_at: "desc" },
      },
      risk_predictions: { orderBy: { predicted_at: "desc" }, take: 1 },
      reminders: {
        where: { sent_at: { gte: sevenDaysAgo } },
        orderBy: { sent_at: "desc" },
      },
    },
  });

  if (!customer) {
    throw new AppError(404, "NOT_FOUND", "Customer tidak ditemukan");
  }

  const [stats, rescheduleRows, ai_summary] = await Promise.all([
    buildStats(customer.id),
    prisma.reschedules.findMany({
      where: {
        attendance: { customer_id: customer.id },
        requested_at: { gte: sevenDaysAgo },
      },
      orderBy: { requested_at: "desc" },
      select: {
        id: true,
        old_schedule: true,
        new_schedule: true,
        reason: true,
        requested_at: true,
        attendance: { select: { customer_package_id: true } },
      },
    }),
    prisma.ai_summaries.findFirst({
      where: { customer_id: customer.id, status: { not: "discarded" } },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const packageName = new Map(
    customer.customer_packages.map((cp) => [cp.id, cp.packages?.name ?? null]),
  );

  const reschedules = rescheduleRows.map(({ attendance, ...r }) => ({
    ...r,
    package_name: packageName.get(attendance?.customer_package_id) ?? null,
  }));
  const latestRisk = customer.risk_predictions[0] ?? null;
  const isDraftOutdated =
    !ai_summary || (latestRisk && ai_summary.prediction_id !== latestRisk.id);
  return { ...customer, reschedules, ai_summary, isDraftOutdated, stats };
};

exports.update = async (id, data) => {
  const customerId = Number(id); // 3. Pastikan tipe Number
  await assertCustomerExists(customerId);

  const payload = { ...data };
  if ("birth_date" in payload) payload.birth_date = toDate(payload.birth_date);
  if ("join_date" in payload) payload.join_date = toDate(payload.join_date);

  if (payload.email) {
    payload.email = payload.email.trim().toLowerCase();
    await assertEmailAvailable(payload.email, customerId);
  }
  return prisma.customers.update({ where: { id: customerId }, data: payload });
};

exports.delete = async (id) => {
  const customerId = Number(id); // 3. Pastikan tipe Number
  await assertCustomerExists(customerId);
  return prisma.customers.update({
    where: { id: customerId },
    data: { deleted_at: new Date() },
  });
};
