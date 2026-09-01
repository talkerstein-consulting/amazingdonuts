import test from "node:test";
import assert from "node:assert/strict";
import { statementDate } from "../apps/api/statements.js";

test("formats PostgreSQL Date objects for statement PDFs", () => {
  assert.equal(statementDate(new Date("2026-08-24T00:00:00.000Z")), "Aug 24, 2026");
});

test("formats date-only statement values without Invalid Date", () => {
  assert.equal(statementDate("2026-09-30"), "Sep 30, 2026");
  assert.equal(statementDate(undefined), "Date unavailable");
});
