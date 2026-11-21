const cron = require("node-cron");
const { syncExpiredPackages } = require("../utils/syncPackages");

exports.startPackageExpiryJob = () => {
  // Jalan setiap hari pukul 00:01 WIB
  cron.schedule(
    "1 0 * * *",
    async () => {
      try {
        const result = await syncExpiredPackages();
        console.log(
          `[CRON] Sinkronisasi paket selesai. ${result.count} paket diubah menjadi expired.`,
        );
      } catch (error) {
        console.error("[CRON] Gagal sinkronisasi paket expired:", error);
      }
    },
    {
      timezone: "Asia/Jakarta",
    },
  );
};
