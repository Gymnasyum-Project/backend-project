const cron = require("node-cron");
const predictionService = require("../services/prediction.service");
const logger = require("../config/logger");

let isRunning = false;

exports.startPredictionCron = () => {
  // Jalan tiap hari jam 02:00 WIB
  cron.schedule(
    "0 2 * * *",
    async () => {
      if (isRunning) {
        logger.warn(
          "Batch prediction sebelumnya masih berjalan, melewati jadwal ini.",
        );
        return;
      }

      isRunning = true;
      logger.info("Memulai batch prediction terjadwal...");

      try {
        const results = await predictionService.batchPredict();
        logger.info(
          `Batch prediction selesai: ${results.length} customer diproses`,
        );
      } catch (err) {
        logger.error(`Batch prediction gagal: ${err.message}`);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Jakarta",
    },
  );
};
