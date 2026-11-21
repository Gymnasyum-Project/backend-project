const cron = require("node-cron");
const { runClustering } = require("../services/clusteringService");
const { autoGeneratePriorityDrafts } = require("../services/aiBatchService");

const startDailyClusteringJob = () => {
  cron.schedule(
    "0 1 * * *", // Contoh: jalan tiap jam 01:00 WIB
    async () => {
      try {
        console.log("[CRON] Memulai clustering harian...");
        await runClustering();

        console.log(
          "[CRON] Clustering selesai, memulai auto-generate draft AI...",
        );
        await autoGeneratePriorityDrafts({
          targetLabels: ["At Risk", "Need Attention"],
        });
      } catch (err) {
        console.error("[CRON] Error pada pipeline clustering & AI:", err);
      }
    },
    { timezone: "Asia/Jakarta" },
  );
};

module.exports = { startDailyClusteringJob };
