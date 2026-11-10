const axios = require("axios");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const http = axios.create({ baseURL: env.INFERENCE_URL, timeout: 5000 });

const VALID_LABELS = ["Active", "Need Attention", "At Risk"];

// Menerjemahkan respons API model (Joy) ke bentuk yang dipakai backend.
// Sekarang API mengembalikan { segmen_kode, segmen }.
// Kalau nanti Joy menambah label / probabilities / top_factors, kode ini
// langsung memakainya tanpa perlu diubah lagi.
exports.predict = async (features) => {
  let data;
  try {
    ({ data } = await http.post("/predict", features));
  } catch (e) {
    // API model membalas { error: "..." } (status 400) kalau fitur kurang / bukan angka
    const detail = e.response?.data?.error;
    throw new AppError(
      502,
      "INFERENCE_UNAVAILABLE",
      detail
        ? `Model AI menolak data: ${detail}`
        : "Layanan model AI tidak dapat dihubungi",
    );
  }

  const label = data?.label ?? data?.segmen;
  if (!VALID_LABELS.includes(label)) {
    throw new AppError(
      502,
      "INFERENCE_BAD_RESPONSE",
      "Label dari model AI tidak dikenali",
    );
  }

  return {
    label,
    probabilities: data.probabilities ?? null, // belum disediakan model → null
    top_factors: data.top_factors ?? [], // belum disediakan model → kosong
  };
};
