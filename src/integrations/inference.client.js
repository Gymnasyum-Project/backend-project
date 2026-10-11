const axios = require('axios');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const http = axios.create({ baseURL: env.INFERENCE_URL, timeout: 5000 });

exports.predict = async (features) => {
  try {
    const { data } = await http.post('/predict', features);
    return data;
  } catch (e) {
    throw new AppError(502, 'INFERENCE_UNAVAILABLE', 'Layanan model AI tidak dapat dihubungi');
  }
};