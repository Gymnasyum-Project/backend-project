// Bobot dasar per label. Angkanya sengaja sama dengan bobot di rumus probabilitas
// (At Risk 70, Need Attention 30) supaya skor konsisten sebelum/sesudah
// model menyediakan probabilities.
const BASE_BY_LABEL = { "At Risk": 70, "Need Attention": 30, Active: 0 };

// p     : probabilities dari model (boleh null)
// f     : features yang dikirim ke model
// label : label hasil model (dipakai kalau p tidak ada)
exports.calcPriority = (p, f, label) => {
  const base = p
    ? (p["At Risk"] ?? 0) * 70 + (p["Need Attention"] ?? 0) * 30
    : (BASE_BY_LABEL[label] ?? 0);

  // Rumus lama memakai f.remaining_ratio, tapi fitur itu tidak ada lagi di kontrak
  // 7 hari, jadi urgensi selalu 0. Sekarang: paket habis dalam 14 hari ke depan.
  // (0 berarti tidak ada paket aktif, jadi tidak dihitung.)
  const d = f.days_until_package_expiry;
  const urgency = d > 0 && d <= 14 ? 10 : 0;

  return Math.min(100, +(base + urgency).toFixed(2));
};
