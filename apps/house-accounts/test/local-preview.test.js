import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { allowLocalPreviewRequest, isolateLocalCookies } from "../apps/api/local-preview.js";

test("local modes isolate incoming, new and cleared login cookies", async () => {
  for (const mode of ["production", "sandbox"]) {
    const app = express();
    app.use(isolateLocalCookies(mode));
    app.get("/", (request, response) => {
      response.cookie("house_session", "new-session");
      response.clearCookie("house_admin_session");
      response.json({ cookies: request.headers.cookie });
    });
    const server = app.listen(0, "127.0.0.1");
    try {
      await new Promise(resolve => server.once("listening", resolve));
      const response = await fetch(`http://127.0.0.1:${server.address().port}/`, {
        headers: { Cookie: "house_session=legacy; local_production_house_session=live; local_sandbox_house_session=test; unrelated=ignored" }
      });
      assert.equal((await response.json()).cookies, `house_session=${mode === "production" ? "live" : "test"}`);
      const cookies = response.headers.getSetCookie();
      assert.match(cookies[0], new RegExp(`^local_${mode}_house_session=new-session;`));
      assert.match(cookies[1], new RegExp(`^local_${mode}_house_admin_session=;`));
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }
});

test("local production preview permits checkout reads, login, and price calculation", () => {
  for (const path of ["/api/storefront/config", "/api/storefront/catalog", "/api/storefront/session", "/api/storefront/addresses"]) {
    assert.equal(allowLocalPreviewRequest("GET", path), true);
  }
  for (const path of ["/api/auth/login", "/api/auth/logout", "/api/storefront/quote", "/api/public/storefront/quote"]) {
    assert.equal(allowLocalPreviewRequest("POST", path), true);
  }
});

test("local production preview blocks financial, account, courier, and background-job writes", () => {
  for (const path of ["/api/storefront/checkout", "/api/public/storefront/checkout", "/api/storefront/house-card", "/api/storefront/register", "/api/orders/house-account", "/api/webhooks/uber", "/api/admin/statements/example/charge", "/api/cron/collections"]) {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) assert.equal(allowLocalPreviewRequest(method, path), false, `${method} ${path}`);
  }
  assert.equal(allowLocalPreviewRequest("PATCH", "/api/storefront/profile"), false);
  assert.equal(allowLocalPreviewRequest("GET", "/api/auth/google/callback"), false);
});
