const prisma = require('../config/prisma');

exports.listByCustomer = (customerId) =>
  prisma.reminders.findMany({
    where: { customer_id: customerId },
    orderBy: { sent_at: 'desc' },
  });

exports.create = (data) => prisma.reminders.create({ data });