import test from "node:test";
import assert from "node:assert/strict";
import { currentStatementWindow } from "../apps/api/statement-preview.js";
import { statementPdf } from "../apps/api/statements.js";

test("current statement starts at approval and advances past issued periods", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  assert.deepEqual(currentStatementWindow({ billing_frequency: "monthly", approved_at: "2026-08-20T10:00:00Z" }, now), {
    periodStart: "2026-08-20", periodEnd: "2026-09-18", nextStatementDate: "2026-10-01",
  });
  assert.deepEqual(currentStatementWindow({ billing_frequency: "monthly", approved_at: "2026-08-20T10:00:00Z" }, now, { period_end: "2026-08-31" }), {
    periodStart: "2026-09-01", periodEnd: "2026-09-18", nextStatementDate: "2026-10-01",
  });
});

test("weekly and manual accounts expose honest issue dates", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  assert.equal(currentStatementWindow({ billing_frequency: "weekly", approved_at: "2026-09-10" }, now).nextStatementDate, "2026-09-21");
  assert.equal(currentStatementWindow({ billing_frequency: "manual", approved_at: "2026-08-10" }, now).nextStatementDate, null);
  assert.equal(currentStatementWindow({ billing_frequency: "manual", approved_at: "2026-08-10" }, now).periodStart, "2026-08-10");
});

test("draft statement PDF downloads without an issued due date", async () => {
  const pdf = await statementPdf({
    status: "draft", period_start: "2026-09-01", period_end: "2026-09-18", due_at: null,
    opening_balance: 0, new_charges: 203, credits_and_payments: 0, closing_balance: 203,
    currency: "CAD", snapshot: { entries: [{ effectiveAt: "2026-09-18", description: "Test order", amount: 203, currency: "CAD", paymentMethod: "house_account", allocatedAmount: 0 }] },
  }, { name: "Amazing Donuts", brand: { accent: "#ff6438" } }, { billing_contact: "Test Donut", organization_name: "Test Org" });
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.length > 1000);
});
