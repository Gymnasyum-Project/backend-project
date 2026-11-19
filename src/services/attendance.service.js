const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const consumesSession = (status) => status === "attended";

const changeSessions = (tx, packageId, delta) =>
  tx.customer_packages.updateMany({
    where:
      delta < 0
        ? { id: packageId, remaining_sessions: { gt: 0 } }
        : { id: packageId },
    data: {
      remaining_sessions: delta < 0 ? { decrement: 1 } : { increment: 1 },
    },
  });

exports.list = (customerId) =>
  prisma.attendance.findMany({
    where: { customer_id: customerId },
    orderBy: { scheduled_at: "desc" },
  });

exports.create = (data) =>
  prisma.$transaction(async (tx) => {
    const pkg = await tx.customer_packages.findFirst({
      where: {
        id: data.customer_package_id,
        customer_id: data.customer_id,
        customers: { deleted_at: null },
      },
      select: { status: true, remaining_sessions: true },
    });

    if (!pkg)
      throw new AppError(400, "PACKAGE_MISMATCH", "Paket tidak ditemukan");
    if (pkg.status !== "active")
      throw new AppError(409, "PACKAGE_NOT_ACTIVE", "Paket sudah tidak aktif");

    // Perbaiki bagian ini: gunakan relasi 'connect' untuk Prisma
    const record = await tx.attendance.create({
      data: {
        coach_name: data.coach_name,
        status: data.status,
        scheduled_at: data.scheduled_at,
        checkin_at: data.status === "attended" ? data.checkin_at : null,
        customers: {
          connect: { id: data.customer_id },
        },
        customer_packages: {
          connect: { id: data.customer_package_id },
        },
      },
    });

    if (consumesSession(record.status)) {
      if (pkg.remaining_sessions <= 0)
        throw new AppError(
          409,
          "NO_REMAINING_SESSIONS",
          "Sisa paket sudah habis",
        );
      await changeSessions(tx, record.customer_package_id, -1);
    }
    return record;
  });
exports.updateStatus = async (id, { status, checkin_at }) => {
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing)
    throw new AppError(404, "NOT_FOUND", "Jadwal attendance tidak ditemukan");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.attendance.update({
      where: { id },
      data: { status, ...(checkin_at && { checkin_at }) },
    });

    const wasConsumed = consumesSession(existing.status);
    const isConsumed = consumesSession(status);
    if (!wasConsumed && isConsumed) {
      await changeSessions(tx, existing.customer_package_id, -1);
    } else if (wasConsumed && !isConsumed) {
      await changeSessions(tx, existing.customer_package_id, +1);
    }

    return updated;
  });
};

exports.reschedules = async (
  attendanceId,
  { visited_at, coach_name, reason },
) =>
  prisma.$transaction(async (tx) => {
    const original = await tx.attendance.findUnique({
      where: { id: attendanceId },
    });
    if (!original)
      throw new AppError(404, "NOT_FOUND", "Jadwal attendance tidak ditemukan");
    if (original.status !== "rescheduled")
      throw new AppError(
        409,
        "NOT_RESCHEDULED",
        "Sesi ini tidak berstatus dijadwal ulang",
      );

    const fulfilled = await tx.reschedules.findFirst({
      where: { attendance_id: attendanceId },
      select: { id: true },
    });
    if (fulfilled)
      throw new AppError(
        409,
        "ALREADY_ATTENDED",
        "Kedatangan untuk sesi ini sudah dicatat",
      );

    const pkg = await tx.customer_packages.findUnique({
      where: { id: original.customer_package_id },
      select: { status: true, remaining_sessions: true },
    });
    if (!pkg || pkg.status !== "active")
      throw new AppError(409, "PACKAGE_NOT_ACTIVE", "Paket sudah tidak aktif");
    if (pkg.remaining_sessions <= 0)
      throw new AppError(
        409,
        "NO_REMAINING_SESSIONS",
        "Sisa paket sudah habis",
      );

    const visit = await tx.attendance.create({
      data: {
        status: "attended",
        scheduled_at: visited_at,
        checkin_at: visited_at,
        coach_name: coach_name || original.coach_name,
        customers: { connect: { id: original.customer_id } },
        customer_packages: { connect: { id: original.customer_package_id } },
      },
    });

    await tx.reschedules.create({
      data: {
        attendance_id: attendanceId,
        old_schedule: original.scheduled_at,
        new_schedule: visited_at,
        reason,
        requested_at: new Date(),
      },
    });

    await changeSessions(tx, original.customer_package_id, -1);

    return visit;
  });

exports.listPendingReschedules = async (customerId) => {
  const done = await prisma.reschedules.findMany({
    where: { attendance: { customer_id: customerId } },
    select: { attendance_id: true },
  });

  return prisma.attendance.findMany({
    where: {
      customer_id: customerId,
      status: "rescheduled",
      id: { notIn: done.map((r) => r.attendance_id).filter(Boolean) },
    },
    orderBy: { scheduled_at: "desc" },
    include: {
      customer_packages: {
        select: { packages: { select: { name: true, service_type: true } } },
      },
    },
  });
};

exports.listReschedulesByCustomer = (customerId) =>
  prisma.reschedules.findMany({
    where: { attendance: { customer_id: customerId } },
    include: { attendance: true },
    orderBy: { id: "desc" },
  });

exports.listSessions = async (customerId) => {
  await assertCustomerExists(customerId);
  return prisma.attendance.findMany({
    where: { customer_id: Number(customerId), status: { not: "cancelled" } },
    orderBy: { scheduled_at: "desc" },
    take: 30,
    select: {
      id: true,
      scheduled_at: true,
      status: true,
      customer_packages: {
        select: { packages: { select: { name: true, service_type: true } } },
      },
    },
  });
};
