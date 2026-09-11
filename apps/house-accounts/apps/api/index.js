import dotenv from "dotenv";
import express from "express";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createPool } from "./db.js";
import { createApp } from "./app.js";
import { SquareAdapter } from "../../packages/square/client.js";
import { deliveryConfig } from "./delivery.js";
import { allowLocalPreviewRequest, isolateLocalCookies } from "./local-preview.js";
import { validateLocalConfig } from "./local-config.js";

const root = new URL("../../../../", import.meta.url);
const mode = process.env.HOUSE_LOCAL_MODE || "production";
// Sandbox must never inherit production credentials or its customer database.
dotenv.config({ path: mode === "sandbox" ? [fileURLToPath(new URL(".env.sandbox.local", root))] : [
  fileURLToPath(new URL(".env.development.local", root)),
  fileURLToPath(new URL(".env.local", root)),
  fileURLToPath(new URL(".env", root)),
  fileURLToPath(new URL("../../.env", import.meta.url))
], quiet: true });
validateLocalConfig(mode, process.env);
const pool=createPool(process.env.DATABASE_URL);
const squareEnvironment = process.env.SQUARE_ENVIRONMENT || "sandbox";
const square = new SquareAdapter({ environment: squareEnvironment, accessToken: process.env.SQUARE_ACCESS_TOKEN || "", apiVersion: process.env.SQUARE_API_VERSION || "2026-07-15" });
const api = createApp({ pool, square, config: {
  secureCookies: false,
  sessionSecret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
  siteUrl: process.env.PUBLIC_SITE_URL || "http://127.0.0.1:5173",
  googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || "",
  squareEnvironment,
  squareApplicationId: process.env.SQUARE_APPLICATION_ID || "",
  squareLocationId: process.env.SQUARE_LOCATION_ID || "",
  institutionalTenderNames: (process.env.SQUARE_INSTITUTIONAL_TENDER_NAMES || "Amazing Donuts Account").split(",").map(value => value.trim()).filter(Boolean),
  delivery: deliveryConfig(),
  deploymentMode: "local",
  mixedEnvironmentTestMode: false,
  uberDirectMode: "sandbox",
  uberDirectAutoDispatch: false,
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: process.env.SMTP_SECURE !== "false",
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
  emailFrom: process.env.ACCOUNTS_EMAIL_FROM || "Amazing Donuts <accounts@amazingdonuts.com>",
  emailReplyTo: process.env.ACCOUNTS_REPLY_TO || process.env.SMTP_USER || "",
  ownerEmails: (process.env.OWNER_NOTIFICATION_EMAILS || process.env.ADMIN_EMAILS || "").split(",").map(value => value.trim()).filter(Boolean)
} });
const app = express();
app.use(isolateLocalCookies(mode));
// Production data can power a local preview, but local clicks must not create live transactions.
if (squareEnvironment === "production") app.use((request, response, next) => {
  if (allowLocalPreviewRequest(request.method, request.path)) return next();
  response.status(403).json({ error: { code: "LOCAL_PREVIEW_READ_ONLY", message: "This is a local preview. Live orders, payments, and account changes are disabled." } });
});
app.use(api);
const port = Number(process.env.HOUSE_API_PORT || 3101);
app.listen(port, "127.0.0.1", () => console.log(`House Account API listening on http://127.0.0.1:${port} (${squareEnvironment === "production" ? "production preview; live writes blocked" : "sandbox payments; isolated local database"})`));
