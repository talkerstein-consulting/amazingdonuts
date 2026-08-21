import assert from "node:assert/strict";
import test from "node:test";
import { BASES, FILLINGS, ICINGS, RULES, SPRINKLES } from "../../src/data/builder.js";
import { customBuilderAvailability, customDonutCartItem, indexCatalog } from "../../src/lib/squareCart.js";

const modifierLists = [
  ["Builder: Icing", ICINGS],
  ["Builder: Filling", FILLINGS],
  ["Builder: Topping", SPRINKLES]
].map(([name, options]) => ({
  id: `list-${name}`,
  name,
  modifiers: options.map((option) => ({ id: `${name}-${option.id}`, name: option.name, soldOut: false }))
}));

const catalog = {
  products: [{
    id: "custom-item",
    name: "Customizable Donut",
    variations: BASES.map((base) => ({
      id: `variation-${base.id}`,
      name: base.name,
      sku: base.sku,
      soldOut: false,
      priceMoney: { amount: 300, currency: "CAD" }
    }))
  }],
  modifierLists
};

test("maps every valid donut builder combination to one Square variation and three modifiers", () => {
  const index = indexCatalog(catalog);
  let combinations = 0;

  for (const base of BASES) {
    const fillings = RULES.takesFilling(base.id) ? FILLINGS.filter((item) => !item.bare) : FILLINGS.filter((item) => item.bare);
    for (const icing of ICINGS) {
      const toppings = SPRINKLES.filter((item) => (
        RULES.takesSprinkles(icing.id) ? RULES.sprinkleAllowed(base.id, item.id) : item.bare
      ));
      for (const filling of fillings) {
        for (const sprinkle of toppings) {
          const item = customDonutCartItem({
            base, icing, filling, sprinkle,
            line: `${base.name}: ${icing.name}, ${filling.name}, ${sprinkle.name}`,
            colourNote: "",
            printName: null
          }, index);
          assert.equal(item.lineItems[0].catalogObjectId, `variation-${base.id}`);
          assert.equal(item.lineItems[0].modifiers.length, 3);
          assert.equal(new Set(item.lineItems[0].modifiers.map((modifier) => modifier.catalogObjectId)).size, 3);
          combinations += 1;
        }
      }
    }
  }

  assert.equal(combinations, 3594);
});

test("reports Square sold-out bases and modifiers to the builder", () => {
  const unavailable = structuredClone(catalog);
  unavailable.products[0].variations[0].soldOut = true;
  unavailable.modifierLists[0].modifiers[0].soldOut = true;
  const availability = customBuilderAvailability(indexCatalog(unavailable), {
    bases: BASES, icings: ICINGS, fillings: FILLINGS, sprinkles: SPRINKLES
  });
  assert.equal(availability.bases.round, false);
  assert.equal(availability.icings.blue, false);
  assert.equal(availability.bases.sofgania, true);
  assert.equal(availability.sprinkles.rainbow, true);
});
