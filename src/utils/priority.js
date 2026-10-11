exports.calcPriority = (p, f) => {
  const base = p['At Risk'] * 70 + p['Need Attention'] * 30;
  const urgency = f.remaining_ratio <= 0.15 ? 10 : 0;
  return Math.min(100, +(base + urgency).toFixed(2));
};