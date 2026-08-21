import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { parse } from "csv-parse";
import { BASES, FILLINGS, ICINGS, SPRINKLES } from "../../src/data/builder.js";
import { PRODUCTS } from "../../src/data/products.js";
import { SquareClient } from "../square/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const imageDirectory = path.join(projectRoot, "public/assets/products");
const args = new Set(process.argv.slice(2));
const dataDirectory = process.argv.slice(2).find((value) => !value.startsWith("--"));

if (!dataDirectory) {
  console.error("Usage: npm run catalog:import -- /absolute/path/to/Website\\ Data [--dry-run]");
  process.exit(1);
}

const environment = process.env.SQUARE_ENVIRONMENT || "sandbox";
if (environment !== "sandbox" && !args.has("--allow-production")) {
  console.error("Refusing to import into Square Production. Use --allow-production explicitly.");
  process.exit(1);
}

for (const key of ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const square = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment,
  apiVersion: process.env.SQUARE_API_VERSION || "2026-07-15"
});

const slugAliases = new Map([
  ["pink-white-sprinkles-donut-barbie", "barbie-donut-pink-white-sprinkles"],
  ["chococlate-chip-jombo-cookie", "chocolate-chip-jumbo-cookie"],
  ["mini-boston-cream-6", "mini-boston-cream-6-pack"],
  ["hot-dog-special-order", "hot-dog-bun-special-order"]
]);

const builderModifierSpecs = [
  { name: "Builder: Icing", options: ICINGS, min: 1, max: 1 },
  { name: "Builder: Filling", options: FILLINGS, min: 1, max: 1 },
  { name: "Builder: Topping", options: SPRINKLES, min: 1, max: 1 }
];

function stableKey(prefix, value) {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 48)}`;
}

function supportedImageMimeType(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a") {
    return "image/gif";
  }
  return null;
}

function stripReadOnly(object) {
  const { updated_at: _updatedAt, is_deleted: _isDeleted, ...writable } = object;
  return writable;
}

function productSlug(row) {
  return row["Product URL"].replace(/^\//, "").replace(/\/$/, "");
}

function productPriceCents(row) {
  const candidates = [row["Sale Price"], row["Retail Price"], row["Calculated Price"]];
  const price = candidates.map(Number).find((value) => Number.isFinite(value) && value > 0);
  if (price === undefined) throw new Error(`No positive price for ${row.Name}`);
  return Math.round(price * 100);
}

function productCategories(row) {
  const categories = [...row["Category Details"].matchAll(/Category Name:\s*([^,|]+)/g)]
    .map((match) => match[1].trim())
    .filter((name) => name && name !== "Shop All" && name !== "SkuIQ Unassigned Category");
  return [...new Set(categories.length ? categories : ["Uncategorized"])];
}

async function readProducts() {
  const rows = [];
  const parser = createReadStream(path.join(dataDirectory, "products-2026-07-08.csv")).pipe(
    parse({ columns: true, bom: true, relax_quotes: true, skip_empty_lines: true })
  );
  for await (const row of parser) rows.push(row);
  return rows.filter(
    (row) => row["Product Visible"] === "Y" && row["Allow Purchases"] === "Y"
  );
}

async function findProductImages(rows) {
  const files = await readdir(imageDirectory);
  const byStem = new Map(files.map((file) => [path.parse(file).name, file]));
  const repoProducts = new Map(PRODUCTS.map((product) => [product.id, product]));
  const images = new Map();

  for (const row of rows) {
    const slug = productSlug(row);
    const repoProduct = repoProducts.get(slugAliases.get(slug) || slug);
    if (!repoProduct?.img) continue;
    const sourceStem = path.parse(repoProduct.img).name;
    const matchedStem = [...byStem.keys()].find(
      (stem) => stem === sourceStem || stem.startsWith(`${sourceStem}-`) || sourceStem.startsWith(`${stem}-`)
    );
    if (matchedStem) images.set(row["Product ID"], path.join(imageDirectory, byStem.get(matchedStem)));
  }
  return images;
}

function indexCatalog(objects) {
  const categories = new Map();
  const modifierLists = new Map();
  const itemsBySku = new Map();
  for (const object of objects) {
    if (object.type === "CATEGORY") categories.set(object.category_data?.name, object);
    if (object.type === "MODIFIER_LIST") {
      modifierLists.set(object.modifier_list_data?.name, object);
    }
    if (object.type !== "ITEM") continue;
    for (const variation of object.item_data?.variations || []) {
      const sku = variation.item_variation_data?.sku;
      if (sku) itemsBySku.set(sku, { item: object, variation });
    }
  }
  return { categories, modifierLists, itemsBySku };
}

function buildObjects(rows, existingCatalog) {
  const categoryNames = [...new Set(rows.flatMap(productCategories))].sort();
  const categoryRefs = new Map();
  const categories = categoryNames.map((name, index) => {
    const existing = existingCatalog.categories.get(name);
    const id = existing?.id || `#category-${index}`;
    categoryRefs.set(name, id);
    return existing
      ? {
          ...stripReadOnly(existing),
          category_data: { ...existing.category_data, name, online_visibility: true }
        }
      : {
          type: "CATEGORY",
          id,
          present_at_all_locations: true,
          category_data: { name, online_visibility: true }
        };
  });

  const modifierRefs = new Map();
  const modifierLists = builderModifierSpecs.map((spec, listIndex) => {
    const existing = existingCatalog.modifierLists.get(spec.name);
    const id = existing?.id || `#builder-list-${listIndex}`;
    const existingModifiers = new Map(
      (existing?.modifier_list_data?.modifiers || []).map((modifier) => [
        modifier.modifier_data?.name,
        modifier
      ])
    );
    modifierRefs.set(spec.name, id);

    const modifiers = spec.options.map((option, optionIndex) => {
      const current = existingModifiers.get(option.name);
      return {
        ...(current ? stripReadOnly(current) : {}),
        type: "MODIFIER",
        id: current?.id || `#builder-${listIndex}-${optionIndex}`,
        present_at_all_locations: true,
        modifier_data: { name: option.name, kitchen_name: option.name, on_by_default: false }
      };
    });

    return {
      ...(existing ? stripReadOnly(existing) : {}),
      type: "MODIFIER_LIST",
      id,
      present_at_all_locations: true,
      modifier_list_data: {
        name: spec.name,
        selection_type: "SINGLE",
        modifiers
      }
    };
  });

  const items = rows.map((row) => {
    const legacyId = row["Product ID"];
    const sku = row.Code.trim() || `AD-LEGACY-${legacyId}`;
    const existing = existingCatalog.itemsBySku.get(sku);
    const itemId = existing?.item.id || `#item-${legacyId}`;
    const variationId = existing?.variation.id || `#variation-${legacyId}`;
    const defaultVariation = {
      ...(existing ? stripReadOnly(existing.variation) : {}),
      type: "ITEM_VARIATION",
      id: variationId,
      present_at_all_locations: true,
      item_variation_data: {
        ...(existing?.variation.item_variation_data || {}),
        item_id: itemId,
        name: "Regular",
        sku,
        pricing_type: "FIXED_PRICING",
        price_money: { amount: productPriceCents(row), currency: "CAD" },
        track_inventory: row["Product Inventoried"] === "Y"
      }
    };
    const variations = sku === "DSPCL-SPR"
      ? BASES.map((base, index) => {
          const baseExisting = existingCatalog.itemsBySku.get(base.sku);
          return {
            ...(baseExisting ? stripReadOnly(baseExisting.variation) : {}),
            type: "ITEM_VARIATION",
            id: baseExisting?.variation.id || `#builder-base-${index}`,
            present_at_all_locations: true,
            item_variation_data: {
              ...(baseExisting?.variation.item_variation_data || {}),
              item_id: itemId,
              name: base.name,
              sku: base.sku,
              pricing_type: "FIXED_PRICING",
              price_money: { amount: productPriceCents(row), currency: "CAD" },
              track_inventory: false
            }
          };
        })
      : [defaultVariation];

    const itemData = {
      ...(existing?.item.item_data || {}),
      name: row.Name.trim(),
      description_html: row.Description?.trim() || "",
      product_type: existing?.item.item_data?.product_type || "REGULAR",
      ecom_visibility: "VISIBLE",
      categories: productCategories(row).map((name) => ({ id: categoryRefs.get(name) })),
      variations
    };

    if (sku === "DSPCL-SPR") {
      const builderListIds = new Set(
        ["Builder: Shape", ...builderModifierSpecs.map((spec) => spec.name)]
          .map((name) => existingCatalog.modifierLists.get(name)?.id)
          .filter(Boolean)
      );
      const preserved = (existing?.item.item_data?.modifier_list_info || []).filter(
        (info) => !builderListIds.has(info.modifier_list_id)
      );
      itemData.modifier_list_info = [
        ...preserved,
        ...builderModifierSpecs.map((spec) => ({
          modifier_list_id: modifierRefs.get(spec.name),
          min_selected_modifiers: spec.min,
          max_selected_modifiers: spec.max,
          enabled: true
        }))
      ];
    }

    return {
      ...(existing ? stripReadOnly(existing.item) : {}),
      type: "ITEM",
      id: itemId,
      present_at_all_locations: true,
      item_data: itemData
    };
  });
  return [...categories, ...modifierLists, ...items];
}

function idMappingsByClientId(response) {
  return new Map((response.id_mappings || []).map((mapping) => [mapping.client_object_id, mapping.object_id]));
}

const rows = await readProducts();
const images = await findProductImages(rows);
const current = await square.searchCatalog({
  object_types: ["ITEM", "CATEGORY", "IMAGE", "MODIFIER_LIST"],
  include_related_objects: true,
  include_deleted_objects: false,
  limit: 100
});
const existingCatalog = indexCatalog(current.objects);
const objects = buildObjects(rows, existingCatalog);

if (args.has("--dry-run")) {
  console.log(JSON.stringify({ environment, products: rows.length, images: images.size, objects }, null, 2));
  process.exit(0);
}

const payloadHash = JSON.stringify(objects);
const upsert = await square.batchUpsertCatalog(objects, stableKey("catalog", payloadHash));
const mappings = idMappingsByClientId(upsert);
const uploadedImages = [];
const skippedImages = [];

for (const row of rows) {
  const legacyId = row["Product ID"];
  const imagePath = images.get(legacyId);
  if (!imagePath) continue;
  const sku = row.Code.trim() || `AD-LEGACY-${legacyId}`;
  const existing = existingCatalog.itemsBySku.get(sku);
  if (existing?.item.item_data?.image_ids?.length) continue;
  const objectId = existing?.item.id || mappings.get(`#item-${legacyId}`);
  const fileBuffer = await readFile(imagePath);
  const mimeType = supportedImageMimeType(fileBuffer);
  if (!mimeType) {
    skippedImages.push({ legacyId, file: path.basename(imagePath), reason: "unsupported format" });
    continue;
  }
  const file = new Blob([fileBuffer], { type: mimeType });
  await square.createCatalogImage({
    objectId,
    imageId: `#image-${legacyId}`,
    caption: row.Name.trim(),
    file,
    idempotencyKey: stableKey("image", `${legacyId}:${createHash("sha256").update(fileBuffer).digest("hex")}`)
  });
  uploadedImages.push(legacyId);
}

const inventoryChanges = rows
  .filter((row) => row["Product Inventoried"] === "Y")
  .map((row) => {
    const legacyId = row["Product ID"];
    const sku = row.Code.trim() || `AD-LEGACY-${legacyId}`;
    const variationId =
      existingCatalog.itemsBySku.get(sku)?.variation.id || mappings.get(`#variation-${legacyId}`);
    return {
      type: "PHYSICAL_COUNT",
      physical_count: {
        reference_id: `legacy-product-${legacyId}-${randomUUID()}`,
        catalog_object_id: variationId,
        state: "IN_STOCK",
        location_id: process.env.SQUARE_LOCATION_ID,
        quantity: String(Math.max(0, Number.parseInt(row["Stock Level"], 10) || 0)),
        occurred_at: new Date().toISOString()
      }
    };
  });

if (inventoryChanges.length) {
  await square.batchChangeInventory(inventoryChanges, randomUUID());
}

console.log(
  JSON.stringify(
    {
      environment,
      products: rows.length,
      categories: objects.filter((object) => object.type === "CATEGORY").length,
      modifierLists: objects.filter((object) => object.type === "MODIFIER_LIST").length,
      imagesMatched: images.size,
      imagesUploaded: uploadedImages.length,
      imagesSkipped: skippedImages,
      inventoryCounts: inventoryChanges.length
    },
    null,
    2
  )
);
