import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isValidNorthAmericanPhone, formatNorthAmericanPhone } from "../../../src/lib/phone.ts";

test("checkout phone validation rejects partial and invalid numbers before wallet initialization", () => {
  for (const phone of ["4169377676", "+1 (416) 937-7676", "2125550123"]) {
    assert.equal(isValidNorthAmericanPhone(phone), true);
    assert.equal(isValidNorthAmericanPhone(formatNorthAmericanPhone(phone)), true);
  }
  for (const phone of ["", "+1 (416) 937", "1234567890", "4161234567", "+91 9876543210"]) {
    assert.equal(isValidNorthAmericanPhone(phone), false);
  }
});

test("deployed payment pages permit the official Google Pay script, frame and logo", () => {
  const config = JSON.parse(readFileSync(new URL("../../../vercel.json", import.meta.url)));
  for (const page of ["/checkout/(.*)", "/account/(.*)"]) {
    const policy = config.headers.find(entry => entry.source === page).headers.find(header => header.key === "Content-Security-Policy").value;
    const directives = Object.fromEntries(policy.split(";").map(value => value.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources]));
    for (const directive of ["script-src", "frame-src", "connect-src"]) assert.ok(directives[directive].includes("https://pay.google.com"));
    assert.ok(directives["img-src"].includes("https://www.gstatic.com"));
    assert.ok(directives["img-src"].includes("https://web.squarecdn.com"));
    assert.ok(directives["font-src"].includes("https://cash-f.squarecdn.com"));
    assert.deepEqual(directives["frame-ancestors"], ["'none'"]);
    assert.ok(!directives["script-src"].includes("'unsafe-inline'"));
  }
});
