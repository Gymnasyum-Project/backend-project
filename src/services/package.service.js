const AppError = require("../utils/AppError");
const prisma = require("../config/prisma");
const { syncExpiredPackages } = require("../utils/syncPackages");

const notFound = (msg) => new AppError(404, "NOT_FOUND", msg);

exports.list = (status) =>
  prisma.packages.findMany({
    where: status ? { status } : undefined,
    orderBy: { name: "asc" },
  });

exports.createPackage = (data) => prisma.packages.create({ data });

exports.update = async (id, data) => {
  const pkgId = Number(id);
  const exists = await prisma.packages.findUnique({ where: { id: pkgId } });
  if (!exists) throw notFound("Paket tidak ditemukan");

  return prisma.packages.update({ where: { id: pkgId }, data });
};

exports.assignToCustomer = async ({ customer_id, package_id, start_date }) => {
  const start = new Date(start_date);
  if (Number.isNaN(start.getTime())) {
    throw new AppError(400, "INVALID_DATE", "start_date tidak valid");
  }

  const pkgId = Number(package_id);
  const custId = Number(customer_id);

  const [pkg, customer] = await Promise.all([
    prisma.packages.findUnique({ where: { id: pkgId } }),
    prisma.customers.findFirst({
      where: { id: custId, deleted_at: null },
    }),
  ]);

  if (!pkg) throw notFound("Paket tidak ditemukan");
  if (!customer) throw notFound("Customer tidak ditemukan");

  if (pkg.status !== "active")
    throw new AppError(409, "PACKAGE_INACTIVE", "Paket sudah tidak aktif");

  if (pkg.duration_days == null || pkg.total_sessions == null)
    throw new AppError(
      409,
      "PACKAGE_INCOMPLETE",
      "Durasi atau jumlah sesi paket belum diisi",
    );

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + pkg.duration_days);

  // Cek apakah end_date langsung terlewati (kasus input tanggal mundur)
  const initialStatus = end < new Date() ? "expired" : "active";

  return prisma.customer_packages.create({
    data: {
      customer_id: custId,
      package_id: pkgId,
      start_date: start,
      end_date: end,
      total_sessions: pkg.total_sessions,
      remaining_sessions: pkg.total_sessions,
      status: initialStatus,
    },
  });
};

exports.getCustomerPackage = async (customerId) => {
  const custId = Number(customerId);
  await syncExpiredPackages(custId);

  return prisma.customer_packages.findMany({
    where: { customer_id: custId },
    include: {
      packages: true,
      customers: {
        select: { id: true, full_name: true },
      },
    },
    orderBy: { start_date: "desc" },
  });
};

exports.getPackageById = async (id) => {
  const result = await prisma.packages.findUnique({
    where: { id: Number(id) },
  });
  if (!result) throw notFound("Master Paket Tidak Ditemukan");
  return result;
};

exports.listCustomerPackages = async () => {
  await syncExpiredPackages();

  return prisma.customer_packages.findMany({
    include: {
      customers: { select: { id: true, full_name: true } },
      packages: true,
    },
    orderBy: { start_date: "desc" },
  });
};

exports.updateCustomerPackage = async (id, data) => {
  const cpId = Number(id);
  const existing = await prisma.customer_packages.findUnique({
    where: { id: cpId },
  });
  if (!existing) throw notFound("Package Customer Tidak Ditemukan");

  const payload = { ...data };
  if (payload.start_date) payload.start_date = new Date(payload.start_date);
  if (payload.end_date) payload.end_date = new Date(payload.end_date);

  return prisma.customer_packages.update({
    where: { id: cpId },
    data: payload,
  });
};
