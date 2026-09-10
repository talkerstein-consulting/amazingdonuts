import { z } from "zod";
import { availableAtLocation, variationAtLocation } from "./catalog-availability.js";

export const DONUT_BOXES = [
  { sku: "half-dozen-box", name: "Build your own half dozen", title: "The Sweet Six", size: 6, amount: 1200 },
  { sku: "dozen-box", name: "Build your own dozen", title: "Take All Twelve", size: 12, amount: 2400 }
];
const normalize = value => String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
export const boxForName = name => DONUT_BOXES.find(box => normalize(box.name) === normalize(name));
export const boxCustomizationSchema = z.object({
  productName: z.string().trim().min(1).max(180),
  kind: z.literal("box"),
  donuts: z.array(z.string().trim().min(1).max(180)).min(6).max(12)
});
export const boxModifierListName = box => `Donut box flavours - choose ${box.size}`;
const availableAt = (object, locationId) => object && !object.is_deleted &&
  !object.absent_at_location_ids?.includes(locationId) &&
  (object.present_at_all_locations !== false || object.present_at_location_ids?.includes(locationId));

export function boxModifiers(item, objects, locationId) {
  const box = boxForName(item.item_data?.name);
  if (!box || item.item_data.is_archived || !availableAt(item, locationId)) return [];
  const list = objects.find(object => object.type === "MODIFIER_LIST" &&
    object.modifier_list_data?.name === boxModifierListName(box) && availableAt(object, locationId));
  const info = item.item_data.modifier_list_info?.find(entry => entry.modifier_list_id === list?.id && entry.enabled !== false);
  if (!info) return [];
  return (list.modifier_list_data.modifiers || []).filter(modifier => {
    if (!availableAt(modifier, locationId) || modifier.modifier_data?.location_overrides?.some(override => override.location_id === locationId && override.sold_out)) return false;
    const donut = objects.find(object => object.type === "ITEM" && normalize(object.item_data?.name) === normalize(modifier.modifier_data?.name));
    return !donut || availableAtLocation(donut, variationAtLocation(donut, locationId), locationId);
  });
}

export function squareBoxSelection(item, custom, objects, locationId) {
  const box = boxForName(item.item_data?.name);
  if (!box) {
    if (custom?.kind === "box") throw Object.assign(new Error("Flavour selections require a donut box."), { status: 409, code: "BOX_ITEM_REQUIRED" });
    return {};
  }
  if (custom?.kind !== "box" || custom.donuts.length !== box.size) {
    throw Object.assign(new Error(`Choose exactly ${box.size} donuts for ${box.name}.`), { status: 409, code: "BOX_SELECTION_REQUIRED" });
  }
  const options = boxModifiers(item, objects, locationId);
  const selected = new Map();
  for (const name of custom.donuts) {
    const modifier = options.find(option => normalize(option.modifier_data.name) === normalize(name));
    if (!modifier) throw Object.assign(new Error(`${name} is not available in this box. Please edit its flavours.`), { status: 409, code: "BOX_FLAVOUR_UNAVAILABLE" });
    const entry = selected.get(modifier.id) || { modifier, quantity: 0 };
    entry.quantity++;
    selected.set(modifier.id, entry);
  }
  return {
    modifiers: [...selected.values()].map(({ modifier, quantity }) => ({ catalog_object_id: modifier.id, quantity: String(quantity) })),
    note: `Pack ${box.size} donuts per box: ${[...selected.values()].map(({ modifier, quantity }) => `${quantity} x ${modifier.modifier_data.name}`).join("; ")}`
  };
}
