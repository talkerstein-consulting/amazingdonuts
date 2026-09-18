import { z } from "zod";
import { availableAtLocation, variationAtLocation, variationPrice } from "./catalog-availability.js";

export const DONUT_BOXES = [
  { sku: "half-dozen-box", name: "Build your own half dozen", title: "The Sweet Six", size: 6 },
  { sku: "dozen-box", name: "Build your own dozen", title: "Take All Twelve", size: 12 }
];

const normalize = value => String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
export const boxForName = name => DONUT_BOXES.find(box => normalize(box.name) === normalize(name));
export const boxCustomizationSchema = z.object({
  productName: z.string().trim().min(1).max(180),
  kind: z.literal("box"),
  donuts: z.array(z.string().trim().min(1).max(180)).min(6).max(12)
});

/** Expand a frontend-only tray into normal Square item variations. */
export function squareBoxLines(custom, lineQuantity, objects, locationId) {
  const box = boxForName(custom?.productName);
  if (!box || custom?.kind !== "box" || custom.donuts.length !== box.size) {
    throw Object.assign(new Error(`Choose exactly ${box?.size || 6} donuts for ${box?.name || "this box"}.`), { status: 409, code: "BOX_SELECTION_REQUIRED" });
  }

  const selected = new Map();
  for (const name of custom.donuts) {
    const item = objects.find(object => object.type === "ITEM" && !object.is_deleted && normalize(object.item_data?.name) === normalize(name));
    const variation = variationAtLocation(item, locationId);
    const price = variation && variationPrice(variation, locationId);
    const eligible = item && !item.item_data?.is_archived && !boxForName(item.item_data?.name) && !/\(special order\)/i.test(item.item_data?.name || "") && Number(price?.amount) > 0 && Number(price?.amount) <= 500;
    if (!eligible || !availableAtLocation(item, variation, locationId)) {
      throw Object.assign(new Error(`${name} is not available in this box. Please edit its flavours.`), { status: 409, code: "BOX_FLAVOUR_UNAVAILABLE" });
    }
    const entry = selected.get(variation.id) || { variation, name: item.item_data.name, quantity: 0 };
    entry.quantity++;
    selected.set(variation.id, entry);
  }

  return [...selected.values()].map(({ variation, name, quantity }) => ({
    catalog_object_id: variation.id,
    quantity: String(quantity * lineQuantity),
    note: `Pack in ${lineQuantity} x ${box.title} (${box.size} donuts): ${name}`
  }));
}
