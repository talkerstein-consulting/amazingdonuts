import test from "node:test";
import assert from "node:assert/strict";
import { availableAtLocation, variationAtLocation, variationPrice } from "../apps/api/catalog-availability.js";
import { buildSquareOrder } from "../apps/api/app.js";
import { lineKeyOf } from "../../../src/lib/cart-line.ts";

const fixture = () => ({ type: "ITEM", id: "ITEM", item_data: { name: "Banana Muffin", variations: [{ id: "VAR", item_variation_data: { price_money: { amount: 275, currency: "CAD" }, location_overrides: [{ location_id: "STORE", price_money: { amount: 300, currency: "CAD" } }] } }] } });
const fulfillment = { type: "pickup", scheduledAt: "2026-10-05T14:00:00Z", recipient: { displayName: "Test Customer", email: "test@example.com", phone: "4165550123" } };

test("live catalog honors location prices and active sold-out overrides", () => {
  const item = fixture(), variation = variationAtLocation(item, "STORE"), override = variation.item_variation_data.location_overrides[0];
  assert.equal(variationPrice(variation, "STORE").amount, 300);
  assert.equal(variationPrice(variation, "OTHER").amount, 275);
  override.sold_out = true;
  assert.equal(availableAtLocation(item, variation, "STORE"), false);
  assert.equal(availableAtLocation(item, variation, "OTHER"), true);
  override.sold_out_valid_until = "2020-01-01T00:00:00Z";
  assert.equal(availableAtLocation(item, variation, "STORE"), true);
});

test("checkout rejects archived, deleted, absent and sold-out products before payment", async () => {
  for (const change of [item => item.is_deleted = true, item => item.item_data.is_archived = true, item => item.absent_at_location_ids = ["STORE"], item => item.item_data.variations[0].item_variation_data.location_overrides[0].sold_out = true]) {
    const item = fixture(); change(item);
    await assert.rejects(buildSquareOrder({ request: async () => ({ objects: [item] }) }, "STORE", { items: [{ name: item.item_data.name, quantity: 1 }], fulfillment }, null), { code: "CATALOG_ITEM_UNAVAILABLE" });
  }
});

test("different boxes and cake letters retain distinct cart identities", () => {
  const product = { id: "half-dozen-box" };
  const key = donuts => lineKeyOf({ product, customization: { kind: "box", donuts } });
  assert.equal(key(["a", "b"]), key(["b", "a"]));
  assert.notEqual(key(["a", "a"]), key(["a", "b"]));
  assert.notEqual(lineKeyOf({ product, customization: { kind: "glyph", glyph: "A" } }), lineKeyOf({ product, customization: { kind: "glyph", glyph: "B" } }));
});

test("Square order notes preserve each distinct cake letter", async () => {
  const item = fixture();
  const order = await buildSquareOrder({ request: async () => ({ objects: [item] }) }, "STORE", { items: ["A", "B"].map(() => ({ name: item.item_data.name, quantity: 1 })), customizations: ["A", "B"].map(glyph => ({ productName: item.item_data.name, kind: "glyph", glyph })), fulfillment }, null);
  assert.deepEqual(order.line_items.map(line => line.note), ["CUSTOM CAKE: A", "CUSTOM CAKE: B"]);
});
