const axios = require('axios');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const http = axios.create({ baseURL: env.LLM_SERVICE_URL, timeout: 15000 });

exports.generateSummary = async (payload) => {
  try {
    const { data } = await http.post('/generate-summary', payload);
    return data;
  } catch (e) {
    throw new AppError(502, 'LLM_UNAVAILABLE', 'Layanan Generative AI tidak dapat dihubungi');
  }
};