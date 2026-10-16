const prisma = require('../config/prisma');
const featureService = require('./feature.service');
const inference = require('../integrations/inference.client');
const { calcPriority } = require('../utils/priority');
const AppError = require('../utils/AppError');
const { listCustomerPackages } = require('./package.service');

exports.predictCustomer = async (customerId) => {
  const customer = await prisma.customers.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer tidak ditemukan');

  const features = await featureService.build(customerId);
  const result = await inference.predict(features);

  const activeModel = await prisma.model_versions.findFirst({ where: { is_active: true } });
  if(!activeModel) throw new AppError(409, 'NO_ACTIVE_MODEL', 'Belum ada model AI yang aktif')

  return prisma.risk_predictions.create({
    data: {
      customer_id: customerId,
      model_version_id: activeModel.id,
      label: result.label,
      probabilities: result.probabilities,
      features,
      top_factors: result.top_factors,
      priority_score: calcPriority(result.probabilities, features),
    },
  });
};

exports.batchPredict = async () => {
  const customers = await prisma.customers.findMany({ select: { id: true } });
  const results = [];
  for (const c of customers) {
    try {
      results.push(await exports.predictCustomer(c.id));
    } catch (e) {
      // lewati customer yang gagal, lanjut ke yang lain
      console.error(`Gagal prediksi customer ${c.id}:`, e.message);
    }
  }
  return results;
};

exports.getHistory = async(customerId, limit)=>{
  const customer = await prisma.customers.findUnique({where: {id:customerId}});
  if(!customer)  throw new AppError(404,'Not Found', 'Customer tidak ditemukan');

  return prisma.risk_predictions.findMany({
    where: {customer_id: customerId},
    orderBy: {predicted_at:'desc'},
    take: limit,
    include: {
      model_versions: {select:{version: true, algorithm: true}}
    },
  });
};