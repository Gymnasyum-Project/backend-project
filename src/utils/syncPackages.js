const prisma = require("../config/prisma");

const syncExpiredPackages = async (customerId = null) => {
  return prisma.customer_packages.updateMany({
    where: {
      ...(customerId && { customer_id: Number(customerId) }),
      status: "active",
      end_date: { lt: new Date() },
    },
    data: {
      status: "expired",
    },
  });
};

module.exports = { syncExpiredPackages };

/**
 * Mengubah status paket 'active' menjadi 'expired' jika end_date sudah lewat.
 * Jika customerId diisi, hanya sinkronkan milik customer tersebut.
 */
