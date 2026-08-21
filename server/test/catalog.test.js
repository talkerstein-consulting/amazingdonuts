import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCatalog } from "../services/catalog.js";

test("normalizes Square items, modifiers, images, and stock", () => {
  const result = normalizeCatalog({
    locationId: "LOC_1",
    objects: [
      {
        type: "ITEM",
        id: "ITEM_1",
        present_at_all_locations: true,
        item_data: {
          name: "Build Your Own Donut",
          categories: [{ id: "CAT_1" }],
          image_ids: ["IMG_1"],
          modifier_list_info: [{ modifier_list_id: "MOD_LIST_1", min_selected_modifiers: 1 }],
          variations: [
            {
              type: "ITEM_VARIATION",
              id: "VAR_1",
              present_at_all_locations: true,
              item_variation_data: {
                name: "Filled",
                price_money: { amount: 350, currency: "CAD" },
                track_inventory: true
              }
            }
          ]
        }
      },
      { type: "CATEGORY", id: "CAT_1", category_data: { name: "Donuts" } },
      {
        type: "MODIFIER_LIST",
        id: "MOD_LIST_1",
        modifier_list_data: {
          name: "Icing",
          selection_type: "SINGLE",
          modifiers: [
            {
              id: "MOD_1",
              modifier_data: { name: "Chocolate", price_money: { amount: 25, currency: "CAD" } }
            }
          ]
        }
      }
    ],
    relatedObjects: [
      { type: "IMAGE", id: "IMG_1", image_data: { url: "https://example.com/donut.jpg" } },
      {
        type: "MODIFIER_LIST",
        id: "MOD_LIST_1",
        modifier_list_data: {
          name: "Icing",
          selection_type: "SINGLE",
          modifiers: [
            {
              id: "MOD_1",
              modifier_data: { name: "Chocolate", price_money: { amount: 25, currency: "CAD" } }
            }
          ]
        }
      }
    ],
    counts: [{ catalog_object_id: "VAR_1", location_id: "LOC_1", quantity: "4" }]
  });

  assert.equal(result.products[0].variations[0].quantityAvailable, 4);
  assert.equal(result.products[0].variations[0].soldOut, false);
  assert.equal(result.products[0].imageUrl, "https://example.com/donut.jpg");
  assert.equal(result.modifierLists[0].modifiers[0].priceMoney.amount, 25);
  assert.equal(result.modifierLists.length, 1);
});
