const prisma = require('../config/prisma');
const llm = require('../integrations/llm.client');
const AppError = require('../utils/AppError');

exports.generate = async (customerId, userId, { regenerate = false } = {}) => {
  const prediction = await prisma.risk_predictions.findFirst({
    where: { customer_id: customerId },
    orderBy: { predicted_at: 'desc' },
    include: { customers: true },
  });
  if (!prediction) throw new AppError(409, 'NO_PREDICTION', 'Jalankan prediksi risiko terlebih dahulu');

  if (!regenerate) {
    const cached = await prisma.ai_summaries.findFirst({
      where: { prediction_id: prediction.id, status: { not: 'discarded' } },
    });
    if (cached) return cached;
  }

  const payload = {
    nama_panggilan: prediction.customers.full_name,
    segmen: prediction.customers.segment,
    risk_label: prediction.label,
    top_factors: prediction.top_factors,
    ringkasan_angka: prediction.features,
  };

  const result = await llm.generateSummary(payload);

  return prisma.ai_summaries.create({
    data: {
      customer_id: customerId,
      prediction_id: prediction.id,
      summary: result.summary,
      followup_draft: result.draft_whatsapp,
      llm_model: result.model_used ?? 'unknown',
      prompt_version: result.prompt_version ?? 'v1',
      status: 'draft',
      created_by: userId,
    },
  });
};

exports.updateSummary = async (id, data)=>{
  const exiting = await prisma.ai_summaries.findUnique({where: {id}});
  if(!exiting)throw new AppError(404, 'Not Found', 'Summary tidak ditemukan')

    return prisma.ai_summaries.update({
      where:{id},
      data
    })
}