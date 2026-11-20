const axios = require("axios");
const env = require("../config/env");
const AppError = require("../utils/AppError");

// Naikkan timeout ke 15 detik untuk mengantisipasi cold-start Vercel
const http = axios.create({ baseURL: env.INFERENCE_URL, timeout: 15000 });

const VALID_LABELS = ["Active", "Need Attention", "At Risk"];

exports.predict = async (features) => {
  let data;
  try {
    ({ data } = await http.post("/predict", features));
  } catch (e) {
    // FastAPI mengembalikan pesan error di `detail` (422/500), sedangkan format lama di `error`
    const rawDetail = e.response?.data?.detail ?? e.response?.data?.error;
    const detail = Array.isArray(rawDetail)
      ? rawDetail.map((err) => `${err.loc?.join(".")}: ${err.msg}`).join(", ")
      : rawDetail;

    throw new AppError(
      502,
      "INFERENCE_UNAVAILABLE",
      detail
        ? `Model AI menolak data: ${detail}`
        : `Layanan model AI tidak dapat dihubungi (${e.message})`,
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
    probabilities: data.probabilities ?? null,
    top_factors: data.top_factors ?? [],
  };
};
