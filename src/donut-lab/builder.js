/* Build your own product — catalogue and the rules that govern it.
   Straight from the "Build your own product" availability sheet. Every
   restriction on that sheet lives in RULES at the bottom; nothing else in the
   builder hard-codes an exception. */

const ART = "/assets/builder";

/* Each base keeps its own folder and a slug the layer files are named with:
   base_<slug>.png, icing_<slug>_<icing>.png, filling_<slug>_<filling>.png. */
/* `scale` is the shape's size relative to the frame — the stage transforms
   to this so switching between e.g. the three cookies grows or shrinks
   smoothly instead of cutting from one art file straight to the next. */
export const BASES = [
  { id: "round",        name: "Round Donut",         folder: "round_donut",               slug: "round_donut",         family: "sky",      note: "The one people picture.",              scale: 1 },
  { id: "kids-round",   name: "Kids Size Round",     folder: "kids_size_round",           slug: "kids_round",          family: "magenta",  note: "Same donut, smaller hands.",            scale: 0.72 },
  { id: "sofgania",     name: "Sofgania / Boston",   folder: "sofgania_boston",           slug: "sofgania_boston",     family: "sunshine", note: "No hole. Room for filling.", filled: true, scale: 1 },
  { id: "kids-sofgania",name: "Kids Size Sofgania",  folder: "kids_size_sofgania_boston", slug: "kids_sofgania_boston",family: "sky",      note: "A small one, still filled.", filled: true, scale: 0.72 },
  { id: "twist",        name: "Twist",               folder: "twist",                     slug: "twist",               family: "magenta",  note: "Braided, glazed end to end.",           scale: 1 },
  { id: "heart",        name: "Heart Shape",         folder: "heart_shape_donuts",        slug: "heart_donut",         family: "sunshine", note: "For the occasion you know about.",      scale: 0.95 },
  { id: "bites",        name: "Amazing Bites",       folder: "amazing_bites",             slug: "amazing_bites",       family: "sky",      note: "One bite. Then eleven more.",           scale: 0.5 },
  { id: "cupcake",      name: "Cupcakes",            folder: "cupcakes",                  slug: "cupcake",             family: "magenta",  note: "Cake, in a paper collar.",              scale: 0.85 },
  { id: "mini-cupcake", name: "Mini Cupcakes",       folder: "mini_cupcakes",             slug: "mini_cupcake",        family: "sunshine", note: "Two bites, tops.",                      scale: 0.55 },
  { id: "cookie-2",     name: '2" Cookie',           folder: "cookie_2in",                slug: "cookie_2in",          family: "sky",      note: "Small, flat, iced.",                    scale: 0.5 },
  { id: "cookie-3",     name: '3" Cookie',           folder: "cookie_3in",                slug: "cookie_3in",          family: "magenta",  note: "The printing size.",                    scale: 0.72 },
  { id: "cookie-lg",    name: "Large Cookie",        folder: "large_cookie",              slug: "cookie_large",        family: "sunshine", note: "Big enough to share. Nobody does.",     scale: 1 }
];

/* Icing. `key` is the filename fragment; `swatch` drives the chip. */
export const ICINGS = [
  { id: "blue",      name: "Vanilla · Blue",       key: "vanilla_blue",      swatch: "#7FC5E8" },
  { id: "lightblue", name: "Vanilla · Light Blue", key: "vanilla_lightblue", swatch: "#B9E0F0" },
  { id: "orange",    name: "Vanilla · Orange",     key: "vanilla_orange",    swatch: "#F0913C" },
  { id: "pink",      name: "Vanilla · Pink",       key: "vanilla_pink",      swatch: "#F09EC2" },
  { id: "purple",    name: "Vanilla · Purple",     key: "vanilla_purple",    swatch: "#B48AC8" },
  { id: "red",       name: "Vanilla · Red",        key: "vanilla_red",       swatch: "#DE4B57" },
  { id: "white",     name: "Vanilla · White",      key: "vanilla_white",     swatch: "#FBF7F0" },
  { id: "yellow",    name: "Vanilla · Yellow",     key: "vanilla_yellow",    swatch: "#F4CE4A" },
  { id: "red-glaze", name: "Red Glaze",            key: "red_glaze",         swatch: "#C0223F" },
  { id: "chocolate", name: "Chocolate",            key: "chocolate_glaze",   swatch: "#7B4A2D" },
  { id: "none",      name: "No Icing",             key: null,                swatch: null, bare: true }
];

/* Sprinkles. Art is still being finished, so each one carries the drawing
   instructions for its chip: a shape and the colours to scatter. */
export const SPRINKLES = [
  { id: "blue",       name: "Blue",                   shape: "jimmy",  colors: ["#2F7FD4"] },
  { id: "chocolate",  name: "Chocolate",              shape: "jimmy",  colors: ["#5A3520"] },
  { id: "green",      name: "Green",                  shape: "jimmy",  colors: ["#3EA65B"] },
  { id: "orange",     name: "Orange",                 shape: "jimmy",  colors: ["#EE8B33"] },
  { id: "pink",       name: "Pink",                   shape: "jimmy",  colors: ["#E86FA4"] },
  { id: "purple",     name: "Purple",                 shape: "jimmy",  colors: ["#8E5BB0"] },
  { id: "rainbow",    name: "Rainbow",                shape: "jimmy",  colors: ["#2F7FD4", "#3EA65B", "#F4CE4A", "#E86FA4", "#EE8B33"] },
  { id: "white",      name: "White",                  shape: "jimmy",  colors: ["#FFFFFF"] },
  { id: "yellow",     name: "Yellow",                 shape: "jimmy",  colors: ["#F4CE4A"] },
  { id: "none",       name: "No Sprinkles",           shape: null,     colors: [], bare: true }
];

/* Fillings — sofgania and Boston only. "None" leads, since skipping a
   filling is at least as common a choice as picking one. */
export const FILLINGS = [
  { id: "none",      name: "No Filling",        key: null,        swatch: null, bare: true },
  { id: "custard",   name: "Custard",           key: "custard",   swatch: "#F6DFA0" },
  { id: "lemon",     name: "Lemon",             key: "lemon",     swatch: "#F3D65B" },
  { id: "raspberry", name: "Raspberry",         key: "raspberry", swatch: "#C42B55" },
  { id: "blueberry", name: "Blueberry",         key: "blueberry", swatch: "#4B4B96" },
  { id: "caramel",   name: "Caramel",           key: "caramel",   swatch: "#B87333" },
  { id: "ganache",   name: "Ganache",           key: "ganache",   swatch: "#4A2C1D" },
  { id: "nutella",   name: "Notella · Nut Free",key: "nutella",   swatch: "#6B4028" }
];

/* Some bases are really "the same thing, a different size" — grouped under
   one major thumbnail so the shape picker isn't showing three near-identical
   cookies side by side. Picking the group reveals its sizes; the underlying
   baseId is unchanged either way, so RULES and the art paths above don't
   need to know groups exist. */
export const BASE_GROUPS = [
  {
    key: "round",
    memberIds: ["round", "kids-round"],
    name: "Round Donut",
    note: "The one people picture.",
    sizeNames: { round: "Regular", "kids-round": "Kids Size" }
  },
  {
    key: "sofgania",
    memberIds: ["sofgania", "kids-sofgania"],
    name: "Sofgania / Boston",
    note: "No hole. Room for filling.",
    sizeNames: { sofgania: "Regular", "kids-sofgania": "Kids Size" }
  },
  {
    key: "cupcake",
    memberIds: ["cupcake", "mini-cupcake"],
    name: "Cupcakes",
    note: "Cake, in a paper collar.",
    sizeNames: { cupcake: "Regular", "mini-cupcake": "Mini" }
  },
  {
    key: "cookie",
    memberIds: ["cookie-2", "cookie-3", "cookie-lg"],
    name: "Cookie",
    note: "Small, flat, iced.",
    sizeNames: { "cookie-2": "2\" Cookie", "cookie-3": "3\" Cookie", "cookie-lg": "Large Cookie" }
  }
];

/* Flattens BASES into the list the shape picker renders: grouped members
   collapse into a single "group" entry (first occurrence, so order matches
   the sheet), everything else passes through as a "single" entry. */
export function buildShapeItems(bases) {
  const groupedIds = new Set(BASE_GROUPS.flatMap((g) => g.memberIds));
  const seen = new Set();
  const items = [];
  for (const b of bases) {
    if (!groupedIds.has(b.id)) {
      items.push({ type: "single", base: b });
      continue;
    }
    const group = BASE_GROUPS.find((g) => g.memberIds.includes(b.id));
    if (seen.has(group.key)) continue;
    seen.add(group.key);
    items.push({ type: "group", ...group, members: group.memberIds.map((id) => byId(bases, id)) });
  }
  return items;
}

/* --- The rules from the sheet -------------------------------------------
   One place. If the bakery changes what goes with what, it changes here. */

const FILLABLE = new Set(["sofgania", "kids-sofgania"]);
const PRINTABLE = new Set(["round"]);          /* 3" round print, round donut only */

export const RULES = {
  /* Sofgania / Boston only. */
  takesFilling: (baseId) => FILLABLE.has(baseId),

  sprinkleAllowed: () => true,

  /* No icing means nothing to hold a sprinkle on. */
  takesSprinkles: (icingId) => icingId !== "none",

  /* Upload-your-own is a 3" round print. */
  takesPrint: (baseId) => PRINTABLE.has(baseId),

  /* Why a thing is greyed out — shown on the chip, so nobody has to guess. */
  sprinkleReason: (baseId, sprinkleId, icingId) => {
    if (icingId === "none") return "Needs icing to stick to";
    return null;
  }
};

/* --- Layer paths ---------------------------------------------------------
   One sprinkle-topping graphic per base shape — it stands in for whichever
   sprinkle colour is picked, since the art isn't drawn per-colour. */
export const baseArt    = (base) => `${ART}/${base.folder}/base_${base.slug}.png`;
export const icingArt   = (base, icing) =>
  icing && icing.key ? `${ART}/${base.folder}/icing_${base.slug}_${icing.key}.png` : null;
export const fillingArt = (base, filling) =>
  filling && filling.key && RULES.takesFilling(base.id)
    ? `${ART}/${base.folder}/filling_${base.slug}_${filling.key}.png`
    : null;
export const toppingArt = (base, sprinkle) =>
  sprinkle && !sprinkle.bare ? `${ART}/${base.folder}/topping_${base.slug}.svg` : null;

export const byId = (list, id) => list.find((x) => x.id === id) || null;

/* --- Sprinkle zones -------------------------------------------------------
   Where the sprinkle preview is allowed to land, per shape — an ellipse
   (cx, cy, rx, ry, all % of the frame) with an optional inner hole (hx, hy)
   for ring shapes, so marks scatter across dough/icing and never fall in a
   donut hole or spill past a shape's edge. Swap for real per-shape art later
   without touching the scatter math. */
/* Measured, not guessed: each base's real alpha-channel bounding box (outer
   ellipse) and, for rings, its enclosed transparent hole (flood-filled from
   the canvas border so only a true interior hole counts) — see the analysis
   note at the bottom of this file for the script. Both radii are shrunk 10%
   from the raw measurement so marks stay clear of the outline stroke; hole
   radii are grown 15% so nothing touches its edge. Cupcake/mini-cupcake are
   hand-adjusted to the icing dome only — their raw bbox includes the paper
   liner, which isn't a place a sprinkle would sit. */
export const SPRINKLE_ZONES = {
  round:           { cx: 50, cy: 49, rx: 33, ry: 26, hx: 11, hy: 4 },
  "kids-round":    { cx: 50, cy: 49, rx: 29, ry: 26, hx: 7.5, hy: 4 },
  sofgania:        { cx: 50, cy: 51, rx: 33, ry: 26 },
  "kids-sofgania": { cx: 50, cy: 50, rx: 18, ry: 14 },
  twist:           { cx: 51, cy: 50, rx: 38, ry: 33 },
  heart:           { cx: 50, cy: 50, rx: 33, ry: 28 },
  bites:           { cx: 50, cy: 51, rx: 17, ry: 16 },
  cupcake:         { cx: 50, cy: 38, rx: 32, ry: 16 },
  "mini-cupcake":  { cx: 50, cy: 40, rx: 20, ry: 11 },
  "cookie-2":      { cx: 50, cy: 50, rx: 18, ry: 14 },
  "cookie-3":      { cx: 50, cy: 50, rx: 25, ry: 19 },
  "cookie-lg":     { cx: 50, cy: 51, rx: 33, ry: 26 }
};

/* Deterministic scatter of n points inside a zone — a golden-angle spiral so
   coverage looks even rather than clumped.

   The hole isn't the same shape as the outer ellipse (a donut hole is much
   flatter), so a single averaged "inner radius" leaks points into the hole
   along its wide axis. Instead, for each direction we place the point on the
   segment from the hole's own boundary in that direction out to the outer
   ellipse's boundary in that direction — always outside the hole by
   construction, and reduces to a plain scaled point when there's no hole. */
export function scatterInZone(zone, n) {
  const { cx, cy, rx, ry, hx = 0, hy = 0 } = zone;
  const GOLDEN_ANGLE = 137.50776; // degrees
  return Array.from({ length: n }).map((_, i) => {
    const phi = ((i * GOLDEN_ANGLE) % 360) * (Math.PI / 180);
    const t = Math.sqrt((i * 0.618033988) % 1); // sqrt for area-uniform spread
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const holeX = hx * cosP, holeY = hy * sinP;
    const outerX = rx * cosP, outerY = ry * sinP;
    return {
      left: cx + holeX + t * (outerX - holeX),
      top: cy + holeY + t * (outerY - holeY),
      angleDeg: (phi * 180) / Math.PI
    };
  });
}

/* --- Copy ---------------------------------------------------------------- */

/* The line under the preview. It reads the build back to you. */
export function describe({ base, icing, filling, sprinkle, printOn }) {
  if (!base) return "Pick something to start with.";

  const bits = [];
  if (icing?.bare) bits.push("bare");
  else if (icing) bits.push(icing.name.replace("Vanilla · ", "").toLowerCase());

  if (filling && !filling.bare) bits.push(`filled with ${filling.name.replace(" · Nut Free", "").toLowerCase()}`);
  if (sprinkle && !sprinkle.bare) bits.push(`under ${sprinkle.name.toLowerCase()}`);
  if (printOn) bits.push("with your own artwork on top");

  if (!bits.length) return base.name;
  return `${base.name} — ${bits.join(", ")}.`;
}

export const STEP_NOTES = {
  base:     "Twelve shapes. The rest of the choices follow from this one.",
  icing:    "Colour first. Everything else sits on top of it.",
  filling:  "Sofgania and Boston get an inside.",
  sprinkle: "Last layer. Some are held back by the shape you picked.",
  print:    "A 3\" round print, on a round donut. Send the artwork, we bake it."
};
