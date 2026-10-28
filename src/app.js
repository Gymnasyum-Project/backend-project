const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const routes = require("./routes");
const { general } = require("./middlewares/rateLimiter");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const app = express();
app.use(helmet());
// app.use(cors({ origin: env.CORS_ORIGIN }));
const allowedOrigins = String(env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isLocalOrigin = (origin) =>
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):5173$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (env.NODE_ENV !== "production" && isLocalOrigin(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));
app.use(general);

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
