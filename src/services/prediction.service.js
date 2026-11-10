const prisma = require("../config/prisma");
const featureService = require("./feature.service");
const inference = require("../integrations/inference.client");
const { calcPriority } = require("../utils/priority");
const AppError = require("../utils/AppError");

exports.predictCustomer = async (customerId) => {
  const customer = await prisma.customers.findFirst({
    where: { id: customerId, deleted_at: null },
  });
  if (!customer)
    throw new AppError(404, "NOT_FOUND", "Customer tidak ditemukan");

  // cek model aktif dulu supaya tidak memanggil API model dengan sia-sia
  const activeModel = await prisma.model_versions.findFirst({
    where: { is_active: true },
  });
  if (!activeModel)
    throw new AppError(409, "NO_ACTIVE_MODEL", "Belum ada model AI yang aktif");

  const features = await featureService.build(customerId);
  const result = await inference.predict({
    customer_id: String(customerId),
    ...features,
  });

  return prisma.risk_predictions.create({
    data: {
      customer_id: customerId,
      model_version_id: activeModel.id,
      label: result.label,
      // null tidak boleh dikirim langsung ke kolom Json oleh Prisma.
      // undefined = field tidak diisi (NULL di database). Hanya jalan kalau kolomnya `Json?`.
      // Kalau di schema.prisma kolomnya `Json` (wajib), ganti `?? undefined` jadi `?? {}`.
      probabilities: result.probabilities ?? undefined,
      features,
      top_factors: result.top_factors,
      priority_score: calcPriority(
        result.probabilities,
        features,
        result.label,
      ),
    },
  });
};

exports.batchPredict = async () => {
  const customers = await prisma.customers.findMany({
    where: { deleted_at: null },
    select: { id: true },
  });
  const results = [];
  for (const c of customers) {
    try {
      results.push(await exports.predictCustomer(c.id));
    } catch (e) {
      // satu customer gagal tidak menghentikan yang lain, tapi jangan diam-diam
      console.error(`[batchPredict] customer ${c.id} gagal: ${e.message}`);
    }
  }
  return results;
};

exports.getHistory = async (customerId, limit) => {
  const customer = await prisma.customers.findUnique({
    where: { id: customerId },
  });
  if (!customer)
    throw new AppError(404, "NOT_FOUND", "Customer tidak ditemukan");

  return prisma.risk_predictions.findMany({
    where: { customer_id: customerId },
    orderBy: { predicted_at: "desc" },
    take: limit,
    include: {
      model_versions: { select: { version: true, algorithm: true } },
    },
  });
};
