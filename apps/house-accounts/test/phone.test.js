import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNorthAmericanPhone } from "../apps/api/app.js";

test("normalizes formatted Canadian and US phone numbers to international storage", () => {
  assert.equal(normalizeNorthAmericanPhone("647-510-6139"), "+16475106139");
  assert.equal(normalizeNorthAmericanPhone("+1 (647) 510-6139"), "+16475106139");
  assert.equal(normalizeNorthAmericanPhone(""), "");
});
