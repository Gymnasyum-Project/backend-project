const prisma = require('../config/prisma');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

exports.build = async (customerId) => {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const attendance = await prisma.attendance.findMany({
    where: { customer_id: customerId, scheduled_at: { gte: since } },
  });

  const attended = attendance.filter((a) => a.status === 'attended').length;
  const missed = attendance.filter((a) => a.status === 'missed').length;
  const rescheduled = attendance.filter((a) => a.status === 'rescheduled').length;

  const pkg = await prisma.customer_packages.findFirst({
    where: { customer_id: customerId, status: 'active' },
    orderBy: { start_date: 'desc' },
  });

  const reminders = await prisma.reminders.findMany({ where: { customer_id: customerId, sent_at: { gte: since } } });
  const reminderCount = reminders.length;
  const reminderResponded = reminders.filter((r) => r.response_status === 'replied').length;

  const lastVisit = attendance
    .filter((a) => a.status === 'attended' && a.checkin_at)
    .sort((a, b) => b.checkin_at - a.checkin_at)[0];

  const daysUntil = (date) => Math.max(0, Math.floor((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24)));
  const daysSince = (date) => Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));

  return {
    attendance_frequency_30d: attended,
    missed_session_count_30d: missed,
    reschedule_frequency_30d: rescheduled,
    remaining_package_sessions: pkg?.remaining_sessions ?? 0,
    days_until_package_expiry: pkg?.end_date ? daysUntil(pkg.end_date) : 0,
    days_since_last_visit: lastVisit ? daysSince(lastVisit.checkin_at) : 999,
    reminder_count_30d: reminderCount,
    reminder_response_count_30d: reminderResponded,
  };

};