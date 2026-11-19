const prisma = require('../config/prisma');

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7;

const daysUntil = (date) => Math.max(0, Math.floor((new Date(date) - Date.now()) / DAY_MS));
const daysSince = (date) => Math.max(0, Math.floor((Date.now() - new Date(date)) / DAY_MS));
const daysBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / DAY_MS));

// Fitur final yang disepakati tim (13 fitur + customer_id yang ditambahkan di prediction.service).
// Dihitung untuk SATU paket aktif: yang start_date-nya paling baru.
exports.build = async (customerId) => {
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  const [attendance7d, pkg, reminders, lastVisit, totalAttended] = await Promise.all([
    prisma.attendance.findMany({
      where: { customer_id: customerId, scheduled_at: { gte: since } },
    }),
    prisma.customer_packages.findFirst({
      where: { customer_id: customerId, status: 'active' },
      orderBy: { start_date: 'desc' },
    }),
    prisma.reminders.findMany({
      where: { customer_id: customerId, sent_at: { gte: since } },
    }),
    // kunjungan terakhir dicari dari SELURUH riwayat, bukan hanya 7 hari
    prisma.attendance.findFirst({
      where: { customer_id: customerId, status: 'attended' },
      orderBy: { scheduled_at: 'desc' },
      select: { scheduled_at: true, checkin_at: true },
    }),
    // TO CONFIRM dengan Joy: total_sessions_attended = seluruh riwayat customer (default di sini)
    // atau hanya untuk paket aktif? Kalau per paket, tambahkan:
    //   customer_package_id: pkg?.id  (pkg harus diambil dulu, bukan di Promise.all yang sama)
    prisma.attendance.count({
      where: { customer_id: customerId, status: 'attended' },
    }),
  ]);

  const attended7d = attendance7d.filter((a) => a.status === 'attended').length;
  const missed7d = attendance7d.filter((a) => a.status === 'missed').length;
  const rescheduled7d = attendance7d.filter((a) => a.status === 'rescheduled').length;
  const reminderResponded = reminders.filter((r) => r.response_status === 'replied').length;

  const hasEverVisited = totalAttended > 0;
  const daysSincePurchase = pkg?.start_date ? daysSince(pkg.start_date) : 0;

  return {
    // --- paket ---
    package_total_sessions: pkg?.total_sessions ?? 0,
    package_duration_days:
      pkg?.start_date && pkg?.end_date ? daysBetween(pkg.start_date, pkg.end_date) : 0,
    days_since_package_purchase: daysSincePurchase,
    // --- riwayat kunjungan ---
    total_sessions_attended: totalAttended,
    has_ever_visited: hasEverVisited ? 1 : 0,
    // --- jendela 7 hari ---
    attendance_frequency_7d: attended7d,
    missed_session_count_7d: missed7d,
    reschedule_frequency_7d: rescheduled7d,
    // --- sisa paket ---
    remaining_package_sessions: pkg?.remaining_sessions ?? 0,
    days_until_package_expiry: pkg?.end_date ? daysUntil(pkg.end_date) : 0,
    // --- kunjungan terakhir ---
    // TO CONFIRM dengan Joy: nilai untuk customer yang belum pernah hadir.
    // Default di sini: hari sejak paket dibeli (lama menunggu tanpa datang).
    days_since_last_visit: lastVisit
      ? daysSince(lastVisit.checkin_at ?? lastVisit.scheduled_at)
      : daysSincePurchase,
    // --- reminder ---
    reminder_count_7d: reminders.length,
    reminder_response_count_7d: reminderResponded,
  };
};