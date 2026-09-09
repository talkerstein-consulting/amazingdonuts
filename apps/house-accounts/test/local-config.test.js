import test from "node:test";
import assert from "node:assert/strict";
import { validateLocalConfig } from "../apps/api/local-config.js";

const sandbox = {
  SQUARE_ENVIRONMENT: "sandbox", SQUARE_APPLICATION_ID: "sandbox-example",
  SQUARE_LOCATION_ID: "test-location", SQUARE_ACCESS_TOKEN: "test-token",
  DATABASE_URL: "postgresql://localhost:55432/amazing_donuts_sandbox"
};

test("local sandbox accepts only its matching credentials and isolated database", () => {
  assert.doesNotThrow(() => validateLocalConfig("sandbox", sandbox));
  for (const database of ["postgresql://db.example.com/amazing_donuts_sandbox", "postgresql://localhost/production"]) {
    assert.throws(() => validateLocalConfig("sandbox", { ...sandbox, DATABASE_URL: database }), /isolated local/);
  }
  assert.throws(() => validateLocalConfig("sandbox", { ...sandbox, SQUARE_APPLICATION_ID: "sq0idp-live" }), /application ID/);
  assert.throws(() => validateLocalConfig("production", sandbox), /environment must match/);
  assert.throws(() => validateLocalConfig("sandbox", { ...sandbox, SQUARE_ACCESS_TOKEN: "" }), /SQUARE_ACCESS_TOKEN/);
});

test("production preview requires a production application and complete configuration", () => {
  const production = { ...sandbox, SQUARE_ENVIRONMENT: "production", SQUARE_APPLICATION_ID: "sq0idp-live", DATABASE_URL: "postgresql://db.example.com/live" };
  assert.doesNotThrow(() => validateLocalConfig("production", production));
  assert.throws(() => validateLocalConfig("invalid", production), /HOUSE_LOCAL_MODE/);
  assert.throws(() => validateLocalConfig("production", { ...production, SQUARE_APPLICATION_ID: "sandbox-example" }), /application ID/);
});
