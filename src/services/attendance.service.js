const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const consumesSession = (status) => status === "attended";

const changeSessions = async (tx, packageId, delta) => {
  await tx.customer_packages.updateMany({
    where:
      delta < 0
        ? { id: packageId, remaining_sessions: { gt: 0 } }
        : { id: packageId },
    data: {
      remaining_sessions: delta < 0 ? { decrement: 1 } : { increment: 1 },
    },
  });

  const updatedPkg = await tx.customer_packages.findUnique({
    where: { id: packageId },
    select: { remaining_sessions: true, status: true, end_date: true },
  });

  if (!updatedPkg) return;

  // Sesi habis -> otomatis completed
  if (updatedPkg.remaining_sessions === 0 && updatedPkg.status === "active") {
    await tx.customer_packages.update({
      where: { id: packageId },
      data: { status: "completed" },
    });
  }

  // Sesi bertambah lagi akibat koreksi status -> kembalikan ke active jika belum expired
  if (
    updatedPkg.remaining_sessions > 0 &&
    updatedPkg.status === "completed" &&
    (!updatedPkg.end_date || new Date(updatedPkg.end_date) >= new Date())
  ) {
    await tx.customer_packages.update({
      where: { id: packageId },
      data: { status: "active" },
    });
  }
};

exports.list = (customerId) =>
  prisma.attendance.findMany({
    where: { customer_id: Number(customerId) },
    orderBy: { scheduled_at: "desc" },
  });

exports.create = (data) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const pkg = await tx.customer_packages.findFirst({
      where: {
        id: Number(data.customer_package_id),
        customer_id: Number(data.customer_id),
        customers: { deleted_at: null },
      },
      select: { status: true, remaining_sessions: true, end_date: true },
    });

    if (!pkg)
      throw new AppError(400, "PACKAGE_MISMATCH", "Paket tidak ditemukan");
    if (
      pkg.status !== "active" ||
      (pkg.end_date && new Date(pkg.end_date) < now)
    ) {
      throw new AppError(
        409,
        "PACKAGE_NOT_ACTIVE",
        "Paket sudah tidak aktif atau masa berlaku habis",
      );
    }

    const record = await tx.attendance.create({
      data: {
        coach_name: data.coach_name,
        status: data.status,
        scheduled_at: data.scheduled_at,
        checkin_at: data.status === "attended" ? data.checkin_at : null,
        customers: { connect: { id: Number(data.customer_id) } },
        customer_packages: {
          connect: { id: Number(data.customer_package_id) },
        },
      },
    });

    // Otomatis catat ke reschedules jika status = "rescheduled"
    if (record.status === "rescheduled") {
      await tx.reschedules.create({
        data: {
          attendance_id: record.id,
          old_schedule: record.scheduled_at,
          new_schedule: data.new_schedule || null,
          reason: data.reason || null,
          requested_at: new Date(),
        },
      });
    }

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

exports.updateStatus = async (
  id,
  { status, checkin_at, new_schedule, reason },
) => {
  const attendanceId = Number(id);
  const existing = await prisma.attendance.findUnique({
    where: { id: attendanceId },
  });
  if (!existing)
    throw new AppError(404, "NOT_FOUND", "Jadwal attendance tidak ditemukan");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.attendance.update({
      where: { id: attendanceId },
      data: { status, ...(checkin_at && { checkin_at }) },
    });

    if (status === "rescheduled" && existing.status !== "rescheduled") {
      await tx.reschedules.create({
        data: {
          attendance_id: existing.id,
          old_schedule: existing.scheduled_at,
          new_schedule: new_schedule || null,
          reason: reason || null,
          requested_at: new Date(),
        },
      });
    }

    if (existing.status === "rescheduled" && status !== "rescheduled") {
      await tx.reschedules.deleteMany({
        where: { attendance_id: existing.id },
      });
    }

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

exports.reschedules = async (id, { visited_at, coach_name, reason }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const attendanceId = Number(id);
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

    const existingReschedule = await tx.reschedules.findFirst({
      where: { attendance_id: attendanceId },
    });

    if (existingReschedule && existingReschedule.new_schedule !== null) {
      throw new AppError(
        409,
        "ALREADY_ATTENDED",
        "Kedatangan untuk sesi ini sudah dicatat",
      );
    }

    const pkg = await tx.customer_packages.findUnique({
      where: { id: original.customer_package_id },
      select: { status: true, remaining_sessions: true, end_date: true },
    });
    if (
      !pkg ||
      pkg.status !== "active" ||
      (pkg.end_date && new Date(pkg.end_date) < now)
    ) {
      throw new AppError(
        409,
        "PACKAGE_NOT_ACTIVE",
        "Paket sudah tidak aktif atau masa berlaku habis",
      );
    }
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

    if (existingReschedule) {
      await tx.reschedules.update({
        where: { id: existingReschedule.id },
        data: {
          new_schedule: visited_at,
          reason: reason || existingReschedule.reason,
        },
      });
    } else {
      await tx.reschedules.create({
        data: {
          attendance_id: attendanceId,
          old_schedule: original.scheduled_at,
          new_schedule: visited_at,
          reason,
          requested_at: new Date(),
        },
      });
    }

    await changeSessions(tx, original.customer_package_id, -1);

    return visit;
  });

exports.listPendingReschedules = async (customerId) => {
  return prisma.attendance.findMany({
    where: {
      customer_id: Number(customerId),
      status: "rescheduled",
      reschedules: {
        some: { new_schedule: null },
      },
    },
    orderBy: { scheduled_at: "desc" },
    include: {
      reschedules: true,
      customer_packages: {
        select: { packages: { select: { name: true, service_type: true } } },
      },
    },
  });
};

exports.listReschedulesByCustomer = (customerId) =>
  prisma.reschedules.findMany({
    where: { attendance: { customer_id: Number(customerId) } },
    include: { attendance: true },
    orderBy: { id: "desc" },
  });
