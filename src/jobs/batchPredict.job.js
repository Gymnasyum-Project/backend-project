const cron = require('node-cron');
const predictionService = require('../services/prediction.service');
const logger = require('../config/logger');

exports.start = () => {
  // Jalan tiap hari jam 02:00
  cron.schedule('0 2 * * *', async () => {
    logger.info('Memulai batch prediction terjadwal...');
    const results = await predictionService.batchPredict();
    logger.info(`Batch prediction selesai: ${results.length} customer diproses`);
  });
};