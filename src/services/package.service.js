const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");

const notFound = (msg) => new AppError(404, "NOT_FOUND", msg);

exports.list = () =>
  prisma.packages.findMany({
    orderBy: { name: "asc" },
  });

exports.createPackage = (data) => prisma.packages.create({ data });

exports.assignToCustomer = async ({ customer_id, package_id, start_date }) => {
  const start = new Date(start_date);
  if (Number.isNaN(start.getTime())) {
    throw new AppError(400, "Not Found", "start_date tidak valid");
  }

  const [pkg, customer] = await Promise.all([
    prisma.packages.findUnique({ where: { id: package_id } }),
    prisma.customers.findUnique({ where: { id: customer_id } }),
  ]);

  if (!pkg) throw notFound("Paket tidak ditemukan");
  if (!customer) throw notFound("Customer tidak ditemukan");

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + pkg.duration_days);

  return prisma.customer_packages.create({
    data: {
      customer_id,
      package_id,
      start_date: start,
      end_date: end,
      total_sessions: pkg.total_sessions,
      remaining_sessions: pkg.total_sessions,
      status: "active",
    },
  });
};
exports.getCustomerPackage = async (id) => {
  const result = await prisma.customer_packages.findUnique({
    where: { id },
    include: {
      packages: true,
      customers: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
  });
  if (!result) throw notFound("Package Customer Tidak Ditemukan");
  return result;
};

exports.getPackageById = async (id) => {
  const result = await prisma.packages.findUnique({ where: { id } });
  if (!result) throw new notFound("Package Customer Tidak Ditemukan");
  return result;
};

exports.listCustomerPackages = () =>
  prisma.customer_packages.findMany({
    include: {
      customers: { select: { id: true, full_name: true } },
      packages: true,
    },
    orderBy: { start_date: "desc" },
  });

exports.updateCustomerPackage = async (id, data) => {
  const existing = await prisma.customer_packages.findUnique({ where: { id } });
  if (!existing)
    throw new AppError(404, "NOT_FOUND", "Package Customer Tidak Ditemukan");

  const result = await prisma.customer_packages.update({
    where: { id },
    data,
  });
  return result;
};
