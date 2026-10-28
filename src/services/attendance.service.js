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
    const record = await tx.attendance.create({ data });
    if (consumesSession(record.status)) {
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

exports.reschedules = async (attendanceId, { new_schedule, reason }) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
  });
  if (!attendance)
    throw new AppError(404, "NOT_FOUND", "Jadwal attendance tidak ditemukan");

  return prisma.$transaction(async (tx) => {
    await tx.reschedules.create({
      data: {
        attendance_id: attendanceId,
        old_schedule: attendance.scheduled_at,
        new_schedule,
        reason,
        requested_at: new Date(),
      },
    });

    // sesi yang dijadwal ulang tidak lagi dianggap terpakai
    if (consumesSession(attendance.status)) {
      await changeSessions(tx, attendance.customer_package_id, +1);
    }

    return tx.attendance.update({
      where: { id: attendanceId },
      data: { status: "rescheduled", scheduled_at: new_schedule },
    });
  });
};

exports.listReschedulesByCustomer = (customerId) =>
  prisma.reschedules.findMany({
    where: { attendance: { customer_id: customerId } },
    include: { attendance: true },
    orderBy: { id: "desc" },
  });
