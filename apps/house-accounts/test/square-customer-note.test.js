import test from "node:test";
import assert from "node:assert/strict";
import { institutionalPinNote, syncInstitutionalPinNote } from "../apps/api/square-customer-note.js";

test("adds an institutional PIN without removing staff notes", () => {
  assert.equal(institutionalPinNote("Prefers email contact.", "4826"), "Prefers email contact.\nInstitutional authorization PIN: 4826");
});

test("replaces the managed PIN line after a reset", () => {
  assert.equal(
    institutionalPinNote("Prefers email contact.\nInstitutional authorization PIN: 4826\nLeave at front desk.", "7391"),
    "Prefers email contact.\nLeave at front desk.\nInstitutional authorization PIN: 7391"
  );
});

test("syncs the PIN with the current Square customer version", async () => {
  const updates = [];
  const square = {
    retrieveCustomer: async () => ({ customer: { note:"Staff note", version:7 } }),
    updateCustomer: async (id, body) => updates.push({ id, body })
  };
  await syncInstitutionalPinNote(square, "customer-1", "2468");
  assert.deepEqual(updates, [{ id:"customer-1", body:{ note:"Staff note\nInstitutional authorization PIN: 2468", version:7 } }]);
});
