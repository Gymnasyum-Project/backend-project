const aiSummaryService = require("../services/aiSummary.service");
const { ok, created } = require("../utils/response");
const AppError = require("../utils/AppError");

exports.update = async (req, res, next) => {
  try {
    const { id } = req.validate.params;
    const summary = await aiSummaryService.updateSummary(id, req.validate.body);
    ok(res, summary);
  } catch (err) {
    next(err);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const { customerId } = req.validate.params;
    const { regenerate = false } = req.validate.body ?? {};
    const summary = await aiSummaryService.generate(customerId, req.user.id, {
      regenerate,
    });
    created(res, summary);
  } catch (err) {
    next(err);
  }
};

exports.getDraftFollowUp = async (req, res, next) => {
  try {
    const { customerId } = req.validate.params;
    const draft = await aiSummaryService.getDraftFollowUp(customerId);
    if (!draft)
      throw new AppError(404, "NOT_FOUND", "Draft follow-up belum tersedia");
    ok(res, draft);
  } catch (err) {
    next(err);
  }
};
