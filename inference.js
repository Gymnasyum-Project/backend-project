// mock-inference/server.js (jalankan terpisah, bukan bagian dari backend Express kamu)
const express = require("express");
const app = express();
app.use(express.json());

app.post("/predict", (req, res) => {
  console.log("Fitur diterima:", req.body);

  // Jawaban palsu, tapi formatnya sesuai kontrak
  res.json({
    label: "Need Attention",
    probabilities: { Active: 0.05, "Need Attention": 0.13, "At Risk": 0.82 },
    top_factors: [
      "kehadiran rendah",
      "sering reschedule",
      "paket hampir habis",
    ],
    model_version: "mock-v0",
  });
});

app.listen(8000, () => console.log("Mock Inference Service jalan di :8000"));
