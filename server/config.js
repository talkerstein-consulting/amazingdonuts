import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const optionalString = (validator) =>
  z.preprocess((value) => (value === "" ? undefined : value), validator.optional());

const databaseSchema = z.object({ DATABASE_URL: z.string().min(1) });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_ORIGIN: z.string().url().default("http://localhost:5189"),
  DATABASE_URL: z.string().min(1),
  SQUARE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  SQUARE_ACCESS_TOKEN: z.string().min(1),
  SQUARE_APPLICATION_ID: optionalString(z.string().min(1)),
  SQUARE_LOCATION_ID: optionalString(z.string().min(1)),
  SQUARE_API_VERSION: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default("2026-07-15"),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().min(1),
  SQUARE_WEBHOOK_NOTIFICATION_URL: z.string().url(),
  CHECKOUT_REDIRECT_URL: z.string().url(),
  MERCHANT_SUPPORT_EMAIL: optionalString(z.string().email()),
  ADMIN_EMAILS: z.string().default(""),
  SESSION_SECRET: optionalString(z.string().min(32)),
  ALLOW_TIPPING: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  ENABLE_DELIVERY: booleanFromEnv,
  DELIVERY_POSTAL_PREFIXES: z.string().default(""),
  DELIVERY_MINIMUM_AMOUNT: z.coerce.number().int().min(0).default(2500),
  DELIVERY_FEE_AMOUNT: z.coerce.number().int().min(0).default(800),
  ENABLE_HOUSE_ACCOUNTS: booleanFromEnv,
  PREP_TIME_MINUTES: z.coerce.number().int().min(0).max(1440).default(30),
  MIN_ORDER_LEAD_MINUTES: z.coerce.number().int().min(0).max(10080).default(60),
  MAX_ORDER_ADVANCE_DAYS: z.coerce.number().int().min(1).max(365).default(30)
});

export function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid backend configuration:\n${details}`);
  }

  const config = parsed.data;
  if (config.NODE_ENV === "production" && !config.SESSION_SECRET) {
    throw new Error("Invalid backend configuration:\nSESSION_SECRET: Required in production");
  }
  return {
    ...config,
    SESSION_SECRET: config.SESSION_SECRET || "local-amazing-donuts-session-secret-change-me",
    DELIVERY_POSTAL_PREFIXES: config.DELIVERY_POSTAL_PREFIXES
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
    ADMIN_EMAILS: config.ADMIN_EMAILS.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  };
}

export function loadDatabaseConfig(env = process.env) {
  return databaseSchema.parse(env);
}
