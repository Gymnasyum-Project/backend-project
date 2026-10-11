exports.ok = (res, data, meta) =>
  res.json({ success: true, data, ...(meta && { meta }) });
exports.created = (res, data) => res.status(201).json({ success: true, data });
