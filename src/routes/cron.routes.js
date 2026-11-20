const express = require("express");
const router = express.Router();
const predictionService = require("../services/prediction.service");

router.get("/batch-predict", async (req, res) => {
  // Verifikasi keamanan agar hanya Vercel Cron yang bisa memanggil endpoint ini
  const authHeader = req.headers.authorization;
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ message: "Unauthorized cron trigger" });
  }

  try {
    const results = await predictionService.batchPredict();
    return res.status(200).json({
      status: "ok",
      processed: results.length,
    });
  } catch (err) {
    console.error("[Vercel Cron Error]:", err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
