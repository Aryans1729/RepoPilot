const cors = require("cors");
const express = require("express");
const morgan = require("morgan");

const { repoRouter } = require("./routes/repoRoutes");
const { agentRouter } = require("./routes/agentRoutes");

function createApp() {
  const app = express();

  app.use(morgan("dev"));
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/repos", repoRouter);
  app.use("/api/agent", agentRouter);

  // Basic error handler (keeps errors consistent for the frontend)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = Number(err.status || 500);
    res.status(status).json({
      error: {
        message: err.message || "Unexpected error",
        status,
      },
    });
  });

  return app;
}

module.exports = { createApp };

