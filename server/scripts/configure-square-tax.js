import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { SquareClient } from "../square/client.js";

const config = loadConfig();
const square = new SquareClient({
  accessToken: config.SQUARE_ACCESS_TOKEN,
  environment: config.SQUARE_ENVIRONMENT,
  apiVersion: config.SQUARE_API_VERSION
});

if (config.SQUARE_ENVIRONMENT === "production" && !process.argv.includes("--production")) {
  throw new Error("Refusing to change production taxes without --production.");
}

const catalog = await square.searchCatalog({
  object_types: ["TAX", "ITEM"],
  include_related_objects: false,
  include_deleted_objects: false,
  limit: 100
});
const existingTax = catalog.objects.find(
  (object) => object.type === "TAX" && object.tax_data?.name === "Ontario HST"
);
const taxId = existingTax?.id || "#ONTARIO_HST";
const objects = [
  {
    type: "TAX",
    id: taxId,
    ...(existingTax?.version ? { version: existingTax.version } : {}),
    present_at_all_locations: true,
    tax_data: {
      name: "Ontario HST",
      calculation_phase: "TAX_SUBTOTAL_PHASE",
      inclusion_type: "ADDITIVE",
      percentage: "13.0",
      applies_to_custom_amounts: true,
      enabled: true
    }
  },
  ...catalog.objects
    .filter((object) => object.type === "ITEM")
    .map((item) => ({
      ...item,
      item_data: {
        ...item.item_data,
        tax_ids: [...new Set([...(item.item_data?.tax_ids || []), taxId])]
      }
    }))
];

const result = await square.batchUpsertCatalog(objects, randomUUID());
const resolvedTax = result.id_mappings?.find((mapping) => mapping.client_object_id === taxId)?.object_id || taxId;
console.log(`Configured Ontario HST at 13% on ${objects.length - 1} Square items (${resolvedTax}).`);

