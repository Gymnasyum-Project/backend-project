const aiSummaryService = require("../services/aiSummary.service");
const { ok, created } = require("../utils/response");

exports.generate = async (req, res, next) => {
  try {
    const { customerId } = req.validate.params;
    const { regenerate } = req.validate.body;

    const summary = await aiSummaryService.generate(customerId, req.user.id, {
      regenerate,
    });
    created(res, summary);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.validate.params;
    const summary = await aiSummaryService.updateSummary(id, req.validate.body);
    ok(res, summary);
  } catch (err) {
    next(err);
  }
};

exports.getDraftFollowUp = async (req, res, next) => {
  try {
    const draft = await aiSummaryService.getDraftFollowUp(req.params.id);
    if (!draft) {
      return res
        .status(404)
        .json({ message: "Draft follow-up belum tersedia" });
    }
    res.json({ data: draft });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
