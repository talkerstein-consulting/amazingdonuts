import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productPanel = readFileSync(new URL("../../../src/shop/ProductPanel.tsx", import.meta.url), "utf8");
const boxBuilder = readFileSync(new URL("../../../src/shop/BoxBuilder.tsx", import.meta.url), "utf8");
const returnPrompt = readFileSync(new URL("../../../src/shop/ReturnPrompt.tsx", import.meta.url), "utf8");

test("product purchase actions make checkout primary and add to bag secondary", () => {
  assert.match(productPanel, /variant="outline"[\s\S]{0,220}className="cabinet__brandAdd"/);
  assert.doesNotMatch(productPanel, /variant="outline" className="cabinet__buyNow"/);
  assert.match(productPanel, /variant="outline"[\s\S]{0,120}className="cabinet__buybarButton"/);
  assert.doesNotMatch(productPanel, /variant="outline" className="cabinet__buybarNow"/);
});

test("standalone add-to-bag actions use the secondary treatment", () => {
  assert.match(boxBuilder, /variant="outline"[\s\S]{0,100}className="boxer__add"/);
  assert.match(returnPrompt, /variant="outline"[\s\S]{0,220}add\(saved!, 1/);
});
