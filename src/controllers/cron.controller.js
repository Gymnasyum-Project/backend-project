const predictionService = require("../services/prediction.service");
const { autoGeneratePriorityDrafts } = require("../services/aiBatch.service");

exports.runBatchPredict = async (req, res, next) => {
  try {
    const results = await predictionService.batchPredict();
    return res.status(200).json({
      status: "ok",
      processed: results.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.runBatchSummary = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 15;
    const result = await autoGeneratePriorityDrafts({ limit });

    return res.status(200).json({
      status: "ok",
      message: "Batch generate AI summary selesai",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
