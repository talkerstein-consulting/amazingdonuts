export const PRINT_PRODUCTS = new Set(['twelve-custom-printed-donuts', 'twelve-custom-printed-cupcakes']);
/**
 * Boxes the visitor fills themselves, and the counts each one is sold in.
 *
 * One product per tray now, so each list holds a single count. It was one
 * product accepting either, which made the grid's tile ambiguous and the
 * builder's rule ("six or twelve, nothing between") something the visitor had
 * to be told rather than something they had already chosen. The list stays a
 * list because the shape is right — a tray sold in two counts is a real
 * possibility, and `boxMaxFor` and the completeness check both read it.
 */
export const BOX_PRODUCTS = new Map([
  ['half-dozen-box', [6]],
  ['dozen-box', [12]]
]);

/** The largest a box gets — the stepper stops the visitor there. */
export const boxMaxFor = (productId: string) => Math.max(...(BOX_PRODUCTS.get(productId) ?? [0]));

/** The Donut Lab's own line. */
export const LAB_PRODUCTS = new Set(['donut-lab-donut']);

/**
 * Bulk-only products, and the smallest order each takes.
 *
 * Petite donuts are $1.50 each and the listing refuses any order under 75, so
 * the smallest thing that can be bought is a pack of 75 — and that, not the
 * donut, is what the catalogue now sells. The price on the row is the pack's
 * ($112.50); the number here is how many donuts are in one, which is what the
 * panel needs to say "150 donuts" when the stepper reads 2.
 *
 * It has been all three of the plausible shapes on the way here, and the other
 * two were both wrong. A flat "$75.00 tray" was an invented price. Then $1.50 a
 * donut with a minimum quantity of 75, which priced it honestly but advertised
 * $1.50 everywhere a price appears — for a thing nobody can buy one of — and
 * hid the $112.50 floor until the bag. A pack is the one shape where the price
 * shown is a price somebody can actually pay.
 */
export const BULK_PACK_SIZES = new Map([['petite-size-donut-bulk-order-only', 75]]);

/**
 * What a petite tray can be finished as. Mirrors the bakery's own order form.
 *
 * `asks` names both the question and which of the Donut Lab's palettes answers
 * it — the sprinkle mixes for Sprinkle, the icing colours for Coloured icing.
 * Reusing the lab's lists rather than writing new ones means the colours on
 * offer here are the colours the bakery actually stocks, and there is one place
 * to add a new one.
 */
export const PETITE_TYPES = [
  { id: 'sprinkle', label: 'Sprinkle', asks: 'sprinkle colours', palette: 'sprinkle' },
  { id: 'glazed', label: 'Glazed', asks: null, palette: null },
  { id: 'icing', label: 'Coloured icing', asks: 'icing colours', palette: 'icing' }
] as const;

export type PetiteType = (typeof PETITE_TYPES)[number]['id'];

/**
 * What one chosen element adds to a lab donut.
 *
 * A placeholder, and marked as one: the bakery has not priced the builder's
 * options yet, and a made-up per-element figure is at least an honest
 * placeholder where a silent flat price was not. Every element costs the same
 * for now, so the arithmetic on the cart line is the count times this.
 */
export const LAB_ELEMENT_PRICE = 0.25;
export const GLYPH_PRODUCTS = new Set(['letter-number-donut-cake']);

/**
 * Donuts that are not flavours, and so cannot go into a build-your-own box.
 *
 * The builder already filters by category and by the $5 line, which is enough
 * to keep the printed dozen and the letter cake out. These two pass every one
 * of those tests and still do not belong:
 *
 * `customizable-donut` is a made-to-order donut — the whole product is a
 * conversation about how it should be decorated, and there is nowhere in a box
 * of six to have it. It is the catalogue's own listing, separate from the Donut
 * Lab line, which is why `SHOP_PRODUCTS` does not already hide it.
 *
 * Petite donuts are sold as a pack of 75 and nothing smaller, so one of them
 * in a half dozen is exactly the purchase the pack size forbids. The $5 price
 * test would now catch the $112.50 pack on its own; it is named here anyway,
 * because the reason it does not belong is the pack, not the price, and a
 * cheaper pack should not quietly become a box flavour.
 */
export const NOT_A_BOX_FLAVOUR = new Set([
  'customizable-donut',
  'petite-size-donut-bulk-order-only'
]);

/**
 * The other thing a box flavour cannot be: something the bakery has to be
 * asked for.
 *
 * A box is picked off the shelf. Every donut in the list is a picture you
 * point at and a tray you collect, and the special-order lines break that in
 * a way the builder has no way to show: they are made to order, on their own
 * timetable, and one of them dropped into a half dozen quietly turns the whole
 * box into a special order without saying so anywhere on the page.
 *
 * Matched on the name rather than listed by id, because the marker is the
 * bakery's own and it puts it in the name — the same convention on every such
 * listing across five counters. A new one added to the catalogue is excluded
 * the day it appears, without this file being touched.
 */
export const isSpecialOrder = (name: string) => /\(special order\)/i.test(name);
/**
 * The smallest a line can be, in LINES — not in donuts.
 *
 * A fixed tray is deliberately absent. 75 is how many donuts are in one petite
 * tray, not how many trays you have to buy: seeding the quantity with it made
 * a single tray arrive in the bag as 75 lines at the tray price. The count is a
 * property of the product, and `FIXED_TRAY_PRODUCTS` is where the panel reads
 * it to say so.
 */
export const minimumQuantityFor = (productId: string) =>
  PRINT_PRODUCTS.has(productId) ? 4 : 1;

export type Artwork = { key: string; name: string; dataUrl: string; count: number; assetId?: string };
export type Customization =
  /** A printed dozen. `icingFlavour` is what the print is laid onto — the two
      the bakery prints on — and `sprinkleColours` is the chosen mix's own name,
      with `sprinkleId` the way back to its swatch in the palette. Both sprinkle
      fields empty means no sprinkles, which is a real answer here: the print is
      the decoration, and sprinkles over it are optional. */
  | { kind: 'print'; icingFlavour: '' | 'Chocolate' | 'Vanilla'; sprinkleId: string; sprinkleColours: string; artworks: Artwork[] }
  | { kind: 'glyph'; glyph: string }
  /** One product id per donut in the box, in the order they were added — so a
      box of three of the same donut is that id three times, not a count. The
      box art places them in slots, and the order is the placement. */
  | { kind: 'box'; donuts: string[] }
  /** A Donut Lab build, as the list of what was chosen and what each cost.
      The labels are the builder's own step names, so the bag reads back the
      journey rather than a product code. */
  | { kind: 'lab'; elements: { label: string; value: string; price: number }[] }
  /** A petite tray's finish. `colours` is free text because the answer is
      whatever the customer's colours are — school, team, brand — and a swatch
      list would refuse most of them. Empty for Glazed, which asks nothing. */
  /** A petite tray's finish. `colours` is the chosen swatch's own name, which
      is what the counter reads; `colourId` is how the panel and the bag line
      find it again in the palette to draw its dots. Both empty for Glazed,
      which asks nothing. */
  | { kind: 'petite'; type: PetiteType; colourId: string; colours: string };

export const customizationFor = (productId: string): Customization | undefined =>
  PRINT_PRODUCTS.has(productId)
    ? { kind: 'print', icingFlavour: '', sprinkleId: '', sprinkleColours: '', artworks: [] }
    : GLYPH_PRODUCTS.has(productId)
      ? { kind: 'glyph', glyph: '' }
      : BOX_PRODUCTS.has(productId)
        ? { kind: 'box', donuts: [] }
        : BULK_PACK_SIZES.has(productId)
          ? { kind: 'petite', type: 'sprinkle', colourId: '', colours: '' }
          : undefined;

export const customizationComplete = (productId: string, qty: number, customization?: Customization) => {
  if (PRINT_PRODUCTS.has(productId)) {
    return qty >= 4 && customization?.kind === 'print' && !!customization.icingFlavour && customization.artworks.length > 0 && customization.artworks.every(art => art.count > 0 && art.count <= 4) && customization.artworks.reduce((sum, art) => sum + art.count, 0) === qty;
  }
  if (GLYPH_PRODUCTS.has(productId)) return customization?.kind === 'glyph' && customization.glyph.trim().length > 0 && customization.glyph.trim().length <= 120;
  /* A part-filled box is not a thing the counter can pack. Six or twelve, and
     nothing between: the trays come in those two sizes, so nine donuts is a
     box the bakery has nowhere to put. `qty` here is how many boxes. */
  const counts = BOX_PRODUCTS.get(productId);
  if (counts) return customization?.kind === 'box' && counts.includes(customization.donuts.length);
  /* Sprinkle and Coloured icing both need to know which colours; Glazed does
     not, and asking would be a required field with no answer. */
  if (BULK_PACK_SIZES.has(productId)) {
    if (customization?.kind !== 'petite') return false;
    const asks = PETITE_TYPES.find((t) => t.id === customization.type)?.asks;
    return !asks || customization.colours.trim().length > 0;
  }
  /* A lab line is complete by construction — it cannot be added until the
     builder's last step — so it never blocks checkout. Listed here so the next
     person does not have to work out why it is absent. */
  if (LAB_PRODUCTS.has(productId)) return true;
  return true;
};

export async function imageDataUrl(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let dataUrl = canvas.toDataURL('image/jpeg', .72);
  while (dataUrl.length > 320000 && canvas.width > 360) {
    const copy = document.createElement('canvas');
    copy.width = Math.round(canvas.width * .8);
    copy.height = Math.round(canvas.height * .8);
    copy.getContext('2d')?.drawImage(canvas, 0, 0, copy.width, copy.height);
    canvas.width = copy.width;
    canvas.height = copy.height;
    canvas.getContext('2d')?.drawImage(copy, 0, 0);
    dataUrl = canvas.toDataURL('image/jpeg', .68);
  }
  return dataUrl;
}
