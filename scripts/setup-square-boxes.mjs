import { randomUUID } from "node:crypto";
import { SquareAdapter } from "../apps/house-accounts/packages/square/client.js";
import { DONUT_BOXES, boxModifierListName } from "../apps/house-accounts/apps/api/donut-boxes.js";
import { SHOP_PRODUCTS } from "../src/data/products.ts";
import { BOX_PRODUCTS, NOT_A_BOX_FLAVOUR, BULK_PACK_SIZES, isSpecialOrder } from "../src/lib/custom-order.ts";
import { availableAtLocation, variationAtLocation } from "../apps/house-accounts/apps/api/catalog-availability.js";

// Dry run unless --apply is supplied. Credentials are read only from the environment.
if (!["production", "sandbox"].includes(process.env.SQUARE_ENVIRONMENT) || !process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
  throw new Error("Explicit Square environment, token, and location are required.");
}
const locationId = process.env.SQUARE_LOCATION_ID;
const square = new SquareAdapter({ environment: process.env.SQUARE_ENVIRONMENT, accessToken: process.env.SQUARE_ACCESS_TOKEN, apiVersion: "2026-07-15" });
let cursor, catalog = [];
do {
  const page = await square.request("/v2/catalog/list", { query: { types: "ITEM,CATEGORY,MODIFIER_LIST", cursor } });
  catalog.push(...page.objects || []);
  cursor = page.cursor;
} while (cursor);
const active = catalog.filter(object => !object.is_deleted);
const template = active.find(object => object.item_data?.name === "Zap Donut - Pink, Blue & White Sprinkles");
if (!availableAtLocation(template, variationAtLocation(template, locationId), locationId)) throw new Error("Expected donut template/location not found.");
const categories = (template.item_data.categories || []).map(({ id }) => ({ id }));
if (process.env.SQUARE_ENVIRONMENT === "production" && !categories.some(({ id }) => active.find(object => object.id === id)?.category_data?.category_type === "MENU_CATEGORY")) {
  throw new Error("The existing donut is not assigned to a restaurant menu.");
}
const flavours = SHOP_PRODUCTS.filter(product => product.category === "Donuts" && !BOX_PRODUCTS.has(product.id) &&
  !NOT_A_BOX_FLAVOUR.has(product.id) && !BULK_PACK_SIZES.has(product.id) && !isSpecialOrder(product.name) &&
  Number(product.price.replace(/[^0-9.]/g, "")) > 0 && Number(product.price.replace(/[^0-9.]/g, "")) <= 5);
for (const flavour of flavours) {
  if (!active.some(item => item.item_data?.name === flavour.name && !item.item_data.is_archived)) {
    throw new Error(`Flavour missing from Square: ${flavour.name}`);
  }
}
const objects = [];
for (const box of DONUT_BOXES) {
  const existing = active.filter(item => item.item_data?.name.toLowerCase() === box.name.toLowerCase() ||
    item.item_data?.variations?.some(variation => variation.item_variation_data?.sku === box.sku));
  if (existing.length) {
    if (existing.length !== 1 || !existing[0].item_data.modifier_list_info?.length) throw new Error(`Review existing box before updating: ${box.name}`);
    console.log(`Already configured: ${box.name} (${existing[0].id})`);
    continue;
  }
  if (active.some(object => object.modifier_list_data?.name === boxModifierListName(box))) throw new Error(`Review existing modifier list for ${box.name}`);
  const itemId = `#${box.sku}`, listId = `#${box.sku}-flavours`;
  objects.push({ type: "MODIFIER_LIST", id: listId, present_at_all_locations: true,
    modifier_list_data: { name: boxModifierListName(box), selection_type: "MULTIPLE", allow_quantities: true,
      min_selected_modifiers: box.size, max_selected_modifiers: box.size,
      modifiers: flavours.map((flavour, index) => ({ type: "MODIFIER", id: `#${box.sku}-flavour-${index}`, present_at_all_locations: true,
        modifier_data: { name: flavour.name, modifier_list_id: listId, ordinal: index, price_money: { amount: 0, currency: "CAD" } } })) } });
  objects.push({ type: "ITEM", id: itemId, present_at_all_locations: false, present_at_location_ids: [locationId],
    item_data: { name: box.name, description: `${box.title}. Choose ${box.size} donuts from the available box flavours.`,
      kitchen_name: `${box.size} DONUT BOX`, product_type: "FOOD_AND_BEV", is_taxable: template.item_data.is_taxable,
      ...(template.item_data.tax_ids ? { tax_ids: template.item_data.tax_ids } : {}),
      ...(categories.length ? { categories } : {}),
      ...(template.item_data.reporting_category?.id ? { reporting_category: { id: template.item_data.reporting_category.id } } : {}),
      ...(template.item_data.channels?.length ? { channels: template.item_data.channels } : {}),
      modifier_list_info: [{ modifier_list_id: listId, enabled: true, min_selected_modifiers: box.size, max_selected_modifiers: box.size }],
      variations: [{ type: "ITEM_VARIATION", id: `#${box.sku}-regular`, present_at_all_locations: false, present_at_location_ids: [locationId],
        item_variation_data: { item_id: itemId, name: `${box.size} donuts`, sku: box.sku, pricing_type: "FIXED_PRICING",
          price_money: { amount: box.amount, currency: "CAD" }, sellable: true, stockable: true, track_inventory: false,
          ...(template.item_data.channels?.length ? { channels: template.item_data.channels } : {}) } }] } });
}
console.log(JSON.stringify({ boxes: DONUT_BOXES, flavours: flavours.map(item => item.name), newObjects: objects.length }, null, 2));
if (process.argv.includes("--apply") && objects.length) {
  const result = await square.request("/v2/catalog/batch-upsert", { method: "POST", body: { idempotency_key: randomUUID(), batches: [{ objects }] } });
  console.log(JSON.stringify({ created: result.objects?.map(item => ({ id: item.id, type: item.type, name: item.item_data?.name || item.modifier_list_data?.name })), mappings: result.id_mappings }, null, 2));
}
