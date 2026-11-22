const express = require("express");
const router = express.Router();
const cronController = require("../controllers/cron.controller");
const env = require("../config/env");

// Middleware verifikasi token rahasia dari Vercel Cron
const verifyCronSecret = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return res.status(401).json({
      status: "fail",
      message: "Unauthorized cron trigger",
    });
  }
  next();
};
router.use(verifyCronSecret);

router.get("/batch-predict", cronController.runBatchPredict);
router.get("/batch-summary", cronController.runBatchSummary);

module.exports = router;
