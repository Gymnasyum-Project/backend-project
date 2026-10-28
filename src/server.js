const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");

const server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info(`Server berjalan di port ${env.PORT}`);
});

process.on("unhandledRejection", (reason) =>
  logger.error({ reason }, "unhandledRejection"),
);
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  server.close(() => process.exit(1));
});
