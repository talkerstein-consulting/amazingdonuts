import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { errorResponse } from "./lib/errors.js";
import { catalogRouter } from "./routes/catalog.js";
import { checkoutRouter } from "./routes/checkout.js";
import { webhooksRouter } from "./routes/webhooks.js";

export function createApp({ config, square, pool }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.APP_ORIGIN, methods: ["GET", "POST"] }));
  app.use((request, response, next) => {
    request.requestId = request.get("x-request-id") || crypto.randomUUID();
    response.set("x-request-id", request.requestId);
    next();
  });

  app.use(
    "/api/webhooks",
    express.raw({ type: "application/json", limit: "1mb" }),
    webhooksRouter({ config, pool, square })
  );
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", async (_request, response, next) => {
    try {
      await pool.query("SELECT 1");
      response.json({ ok: true, squareEnvironment: config.SQUARE_ENVIRONMENT });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", catalogRouter({ square, config }));
  app.use(
    "/api",
    rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }),
    checkoutRouter({ square, config })
  );

  app.use((_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } });
  });
  app.use((error, request, response, _next) => {
    console.error({ requestId: request.requestId, error });
    const result = errorResponse(error);
    response.status(result.status).json({ ...result.body, requestId: request.requestId });
  });

  return app;
}
