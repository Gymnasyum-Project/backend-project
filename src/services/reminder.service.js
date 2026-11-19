const prisma = require("../config/prisma");

exports.listByCustomer = (customerId) =>
  prisma.reminders.findMany({
    where: { customer_id: customerId },
    orderBy: { sent_at: "desc" },
  });
exports.create = async (data) => {
  const customer = await prisma.customers.findFirst({
    where: { id: data.customer_id, deleted_at: null },
    select: { id: true },
  });
  if (!customer)
    throw new AppError(404, "NOT_FOUND", "Customer tidak ditemukan");
  return prisma.reminders.create({ data });
};
exports.update = async (id, { response_status }) => {
  const existing = await prisma.reminders.findUnique({ where: { id } });
  if (!existing)
    throw new AppError(404, "NOT_FOUND", "Reminder tidak ditemukan");
  return prisma.reminders.update({ where: { id }, data: { response_status } });
};
