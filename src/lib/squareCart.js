const FLAVOUR_SKUS = {
  zap: "DZP-PBW",
  barbie: "DBR-PW",
  glazed: "AD-LEGACY-193",
  choc: "DC-GLZ",
  twist: "CTWST",
  petite: "AD-LEGACY-169",
  heart: "DHART",
  star: "DSTRD",
  custom: "DSPCL-SPR"
};

const money = (amount, currency = "CAD") => ({ amount: Number(amount || 0), currency });

export function indexCatalog(catalog) {
  const variationsBySku = new Map();
  for (const product of catalog?.products || []) {
    for (const variation of product.variations || []) {
      if (variation.sku) variationsBySku.set(variation.sku, { ...variation, product });
    }
  }
  const modifierListsByName = new Map(
    (catalog?.modifierLists || []).map((list) => [list.name, list])
  );
  return { variationsBySku, modifierListsByName };
}

export function catalogFlavours(flavours, index) {
  return flavours.map((flavour) => {
    const variation = index.variationsBySku.get(FLAVOUR_SKUS[flavour.id]);
    return variation ? {
      ...flavour,
      price: Number(variation.priceMoney?.amount || 0) / 100,
      currency: variation.priceMoney?.currency || "CAD",
      soldOut: variation.soldOut
    } : { ...flavour, soldOut: true };
  });
}

function modifierId(index, listName, optionName) {
  const list = index.modifierListsByName.get(listName);
  return list?.modifiers.find((modifier) => modifier.name === optionName && !modifier.soldOut)?.id || null;
}

function defaultCustomModifiers(index) {
  return [
    modifierId(index, "Builder: Icing", "Vanilla · Pink"),
    modifierId(index, "Builder: Filling", "No Filling"),
    modifierId(index, "Builder: Topping", "Rainbow")
  ].filter(Boolean).map((catalogObjectId) => ({ catalogObjectId, quantity: 1 }));
}

export function dozenCartItem(flavours, index) {
  const quantities = new Map();
  for (const flavour of flavours) quantities.set(flavour.id, (quantities.get(flavour.id) || 0) + 1);

  const lineItems = [...quantities].map(([id, quantity]) => {
    const variation = index.variationsBySku.get(FLAVOUR_SKUS[id]);
    if (!variation) throw new Error(`Square is missing the ${id} donut SKU.`);
    return {
      catalogObjectId: variation.id,
      quantity,
      modifiers: id === "custom" ? defaultCustomModifiers(index) : [],
      ...(id === "custom" ? { note: "Dozen builder default: round, pink vanilla, no filling, rainbow." } : {})
    };
  });
  const total = flavours.reduce((sum, flavour) => {
    const variation = index.variationsBySku.get(FLAVOUR_SKUS[flavour.id]);
    return sum + Number(variation?.priceMoney?.amount || 0);
  }, 0);

  return {
    id: crypto.randomUUID(),
    kind: "dozen",
    name: "Build Your Dozen",
    description: flavours.map((flavour) => flavour.name).join(", "),
    quantity: 1,
    priceMoney: money(total),
    imageUrl: "/assets/redesign/donut-zap.png",
    lineItems
  };
}

export function customDonutCartItem(build, index) {
  const variation = index.variationsBySku.get(build.base.sku);
  if (!variation || variation.soldOut) throw new Error(`${build.base.name} is sold out in Square.`);
  const selected = [
    ["Builder: Icing", build.icing.name],
    ["Builder: Filling", build.filling.name],
    ["Builder: Topping", build.sprinkle.name]
  ];
  const modifiers = selected.map(([listName, optionName]) => {
    const catalogObjectId = modifierId(index, listName, optionName);
    if (!catalogObjectId) throw new Error(`Square is missing ${optionName}.`);
    return { catalogObjectId, quantity: 1 };
  });
  const notes = [
    build.line,
    build.colourNote ? `Colour request: ${build.colourNote}` : null,
    build.printName ? `Edible print file selected: ${build.printName}. Contact customer for artwork.` : null
  ].filter(Boolean);

  return {
    id: crypto.randomUUID(),
    kind: "custom",
    name: "Custom Donut",
    description: build.line,
    quantity: 1,
    priceMoney: variation.priceMoney || money(0),
    imageUrl: "/assets/redesign/donut-customizable.png",
    lineItems: [{ catalogObjectId: variation.id, quantity: 1, modifiers, note: notes.join(" ") }]
  };
}

export function customBuilderAvailability(index, groups) {
  const availableModifiers = (listName, options) => {
    const list = index.modifierListsByName.get(listName);
    return Object.fromEntries(options.map((option) => [
      option.id,
      Boolean(list?.modifiers.some((modifier) => modifier.name === option.name && !modifier.soldOut))
    ]));
  };
  return {
    bases: Object.fromEntries(groups.bases.map((base) => {
      const variation = index.variationsBySku.get(base.sku);
      return [base.id, Boolean(variation && !variation.soldOut && variation.priceMoney)];
    })),
    icings: availableModifiers("Builder: Icing", groups.icings),
    fillings: availableModifiers("Builder: Filling", groups.fillings),
    sprinkles: availableModifiers("Builder: Topping", groups.sprinkles)
  };
}

export function catalogCartItem({ product, variation, modifiers = [], imageUrl }) {
  const modifierTotal = modifiers.reduce((sum, modifier) => sum + Number(modifier.priceMoney?.amount || 0), 0);
  const optionNames = modifiers.map((modifier) => modifier.name);
  const variationName = variation.name && variation.name !== "Regular" ? variation.name : null;
  return {
    id: crypto.randomUUID(),
    kind: "catalog",
    name: product.name,
    description: [variationName, ...optionNames].filter(Boolean).join(" / ") || product.description || "From the bakery case",
    quantity: 1,
    priceMoney: {
      amount: Number(variation.priceMoney?.amount || 0) + modifierTotal,
      currency: variation.priceMoney?.currency || "CAD"
    },
    imageUrl: imageUrl || "/assets/logo-amazing-donuts.webp",
    lineItems: [{
      catalogObjectId: variation.id,
      quantity: 1,
      modifiers: modifiers.map((modifier) => ({ catalogObjectId: modifier.id, quantity: 1 }))
    }]
  };
}

export const cartTotal = (cart) => cart.reduce(
  (sum, item) => sum + Number(item.priceMoney?.amount || 0) * item.quantity,
  0
);

export const checkoutLineItems = (cart) => cart.flatMap((item) =>
  item.lineItems.map((lineItem) => ({ ...lineItem, quantity: lineItem.quantity * item.quantity }))
);
