const prisma = require("../config/prisma");

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7;

const daysUntil = (date) =>
  Math.max(0, Math.floor((new Date(date) - Date.now()) / DAY_MS));
const daysSince = (date) =>
  Math.max(0, Math.floor((Date.now() - new Date(date)) / DAY_MS));

exports.build = async (customerId) => {
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  const [attendance, pkg, reminders, lastVisit] = await Promise.all([
    prisma.attendance.findMany({
      where: { customer_id: customerId, scheduled_at: { gte: since } },
    }),
    prisma.customer_packages.findFirst({
      where: { customer_id: customerId, status: "active" },
      orderBy: { start_date: "desc" },
    }),
    prisma.reminders.findMany({
      where: { customer_id: customerId, sent_at: { gte: since } },
    }),
    // Kunjungan terakhir dicari dari SELURUH riwayat, bukan hanya 7 hari terakhir.
    // Kalau dibatasi 7 hari, hampir semua customer akan terbaca "tidak pernah hadir" (999).
    prisma.attendance.findFirst({
      where: { customer_id: customerId, status: "attended" },
      orderBy: { scheduled_at: "desc" },
      select: { scheduled_at: true, checkin_at: true },
    }),
  ]);

  const attended = attendance.filter((a) => a.status === "attended").length;
  const missed = attendance.filter((a) => a.status === "missed").length;
  const rescheduled = attendance.filter(
    (a) => a.status === "rescheduled",
  ).length;
  const reminderResponded = reminders.filter(
    (r) => r.response_status === "replied",
  ).length;

  return {
    attendance_frequency_7d: attended,
    missed_session_count_7d: missed,
    reschedule_frequency_7d: rescheduled,
    remaining_package_sessions: pkg?.remaining_sessions ?? 0,
    days_until_package_expiry: pkg?.end_date ? daysUntil(pkg.end_date) : 0,
    days_since_last_visit: lastVisit
      ? daysSince(lastVisit.checkin_at ?? lastVisit.scheduled_at)
      : 999,
    reminder_count_7d: reminders.length,
    reminder_response_count_7d: reminderResponded,
  };
};
