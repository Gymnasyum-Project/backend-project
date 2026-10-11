const prisma = require('../config/prisma');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

exports.build = async (customerId) => {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const attendance = await prisma.attendance.findMany({
    where: { customer_id: customerId, scheduled_at: { gte: since } },
  });

  const total = attendance.length;
  const hadir = attendance.filter((a) => a.status === 'attended').length;
  const missed = attendance.filter((a) => a.status === 'missed').length;
  const reschedule = attendance.filter((a) => a.status === 'rescheduled').length;

  const pkg = await prisma.customer_packages.findFirst({
    where: { customer_id: customerId, status: 'active' },
    orderBy: { start_date: 'desc' },
  });

  const reminders = await prisma.reminders.findMany({ where: { customer_id: customerId } });
  const responded = reminders.filter((r) => r.response_status === 'replied').length;

  const lastVisit = attendance
    .filter((a) => a.status === 'attended' && a.checkin_at)
    .sort((a, b) => b.checkin_at - a.checkin_at)[0];

  const daysBetween = (date) => Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));

  return {
    attendance_rate_30d: total > 0 ? +(hadir / total).toFixed(2) : 0,
    missed_count_30d: missed,
    reschedule_count_30d: reschedule,
    remaining_sessions: pkg?.remaining_sessions ?? 0,
    remaining_ratio: pkg?.total_sessions ? +(pkg.remaining_sessions / pkg.total_sessions).toFixed(2) : 0,
    days_since_last_visit: lastVisit ? daysBetween(lastVisit.checkin_at) : 999,
    reminder_response_rate: reminders.length > 0 ? +(responded / reminders.length).toFixed(2) : 0,
  };
};