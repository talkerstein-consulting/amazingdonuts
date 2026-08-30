import test from "node:test";
import assert from "node:assert/strict";
import { requireOwner, requireStaff } from "../apps/api/auth.js";

test("customer sessions cannot authorize admin routes", () => {
  assert.throws(() => requireStaff({ user:{ role:"owner" } }), { code:"ADMIN_AUTH_REQUIRED" });
});

test("admin sessions authorize owner and staff roles", () => {
  const owner={ role:"owner" };
  const staff={ role:"staff" };
  assert.equal(requireStaff({ adminUser:owner }),owner);
  assert.equal(requireStaff({ adminUser:staff }),staff);
});

test("non-staff admin sessions remain forbidden", () => {
  assert.throws(() => requireStaff({ adminUser:{ role:"viewer" } }), { code:"FORBIDDEN" });
});

test("only owners can manage administrator access", () => {
  const owner = { role:"owner" };
  assert.equal(requireOwner({ adminUser:owner }),owner);
  assert.throws(() => requireOwner({ adminUser:{ role:"staff" } }), { code:"OWNER_REQUIRED" });
});
