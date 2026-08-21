const money = (value) =>
  value
    ? { amount: Number(value.amount || 0), currency: value.currency || "CAD" }
    : null;

const locationEnabled = (object, locationId) => {
  if (!locationId) return true;
  if (object.absent_at_location_ids?.includes(locationId)) return false;
  if (object.present_at_all_locations) return true;
  return object.present_at_location_ids?.includes(locationId) ?? true;
};

const soldOutAtLocation = (data, locationId) => {
  if (!locationId) return false;
  return data?.location_overrides?.some(
    (override) => override.location_id === locationId && override.sold_out === true
  ) || false;
};

export function normalizeCatalog({ objects, relatedObjects = [], counts = [], locationId }) {
  const byId = new Map([...objects, ...relatedObjects].map((object) => [object.id, object]));
  const all = [...byId.values()];
  const inventoryByVariation = new Map(
    counts
      .filter((count) => !locationId || count.location_id === locationId)
      .map((count) => [count.catalog_object_id, Number(count.quantity || 0)])
  );

  const categories = all
    .filter((object) => object.type === "CATEGORY" && !object.is_deleted)
    .map((object) => ({
      id: object.id,
      name: object.category_data?.name || "Uncategorized",
      ordinal: object.category_data?.ordinal ?? null,
      imageId: object.category_data?.image_ids?.[0] || null
    }));

  const modifierLists = all
    .filter((object) => object.type === "MODIFIER_LIST" && !object.is_deleted)
    .map((object) => ({
      id: object.id,
      name: object.modifier_list_data?.name || "Options",
      selectionType: object.modifier_list_data?.selection_type || "MULTIPLE",
      modifiers: (object.modifier_list_data?.modifiers || [])
        .filter((modifier) => !modifier.is_deleted && locationEnabled(modifier, locationId))
        .map((modifier) => ({
          id: modifier.id,
          name: modifier.modifier_data?.name || "Option",
          priceMoney: money(modifier.modifier_data?.price_money),
          ordinal: modifier.modifier_data?.ordinal ?? null,
          soldOut: soldOutAtLocation(modifier.modifier_data, locationId)
        }))
    }));

  const products = objects
    .filter((object) => object.type === "ITEM" && !object.is_deleted)
    .filter((object) => object.item_data?.ecom_visibility !== "HIDDEN")
    .filter((object) => locationEnabled(object, locationId))
    .map((item) => {
      const data = item.item_data || {};
      const imageId = data.image_ids?.[0];
      const image = imageId ? byId.get(imageId) : null;
      const categoryIds = [
        ...(data.categories || []).map((category) => category.id),
        ...(data.category_id ? [data.category_id] : [])
      ];

      return {
        id: item.id,
        name: data.name || "Unnamed item",
        description: data.description_plaintext || data.description || "",
        categoryIds: [...new Set(categoryIds.filter(Boolean))],
        imageUrl: image?.image_data?.url || null,
        modifierListIds: (data.modifier_list_info || []).map((info) => ({
          id: info.modifier_list_id,
          minSelected: info.min_selected_modifiers ?? null,
          maxSelected: info.max_selected_modifiers ?? null,
          enabled: info.enabled !== false
        })),
        variations: (data.variations || [])
          .filter((variation) => !variation.is_deleted && locationEnabled(variation, locationId))
          .map((variation) => ({
            id: variation.id,
            name: variation.item_variation_data?.name || "Regular",
            sku: variation.item_variation_data?.sku || null,
            priceMoney: money(variation.item_variation_data?.price_money),
            trackInventory: variation.item_variation_data?.track_inventory === true,
            quantityAvailable: inventoryByVariation.has(variation.id)
              ? inventoryByVariation.get(variation.id)
              : null,
            soldOut: soldOutAtLocation(variation.item_variation_data, locationId) || (
              variation.item_variation_data?.track_inventory === true
                ? !inventoryByVariation.has(variation.id) || inventoryByVariation.get(variation.id) <= 0
                : false
            )
          }))
      };
    });

  return { categories, modifierLists, products };
}

export async function getPublicCatalog(square, locationId) {
  const catalog = await square.searchCatalog({
    object_types: ["ITEM", "CATEGORY", "MODIFIER_LIST", "TAX", "IMAGE"],
    include_related_objects: true,
    include_deleted_objects: false,
    limit: 100
  });
  const variationIds = catalog.objects
    .filter((object) => object.type === "ITEM")
    .flatMap((item) => item.item_data?.variations || [])
    .map((variation) => variation.id)
    .filter(Boolean);
  const inventory = await square.retrieveInventoryCounts(
    variationIds,
    locationId ? [locationId] : undefined
  );

  return normalizeCatalog({ ...catalog, counts: inventory.counts || [], locationId });
}
