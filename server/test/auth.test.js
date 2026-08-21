import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../services/auth.js";

test("hashes customer passwords with unique salts and verifies without storing plaintext", async () => {
  const first = await hashPassword("Long test password 123!");
  const second = await hashPassword("Long test password 123!");
  assert.notEqual(first, second);
  assert.equal(first.includes("Long test password"), false);
  assert.equal(await verifyPassword("Long test password 123!", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
});

