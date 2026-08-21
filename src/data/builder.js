/* Build your own product — catalogue and the rules that govern it.
   Straight from the "Build your own product" availability sheet. Every
   restriction on that sheet lives in RULES at the bottom; nothing else in the
   builder hard-codes an exception. */

const ART = "/assets/builder";

/* Each base keeps its own folder and a slug the layer files are named with:
   base_<slug>.png, icing_<slug>_<icing>.png, filling_<slug>_<filling>.png. */
export const BASES = [
  { id: "round",         sku: "DSPCL-SPR",                 name: "Round Donut",        folder: "round_donut",               slug: "round_donut",          family: "sky",      note: "The one people picture." },
  { id: "kids-round",    sku: "AD-BUILD-KIDS-ROUND",       name: "Kids Size Round",    folder: "kids_size_round",           slug: "kids_round",           family: "magenta",  note: "Same donut, smaller hands." },
  { id: "sofgania",      sku: "AD-BUILD-SOFGANIA",         name: "Sofgania / Boston",  folder: "sofgania_boston",           slug: "sofgania_boston",      family: "sunshine", note: "No hole. Room for filling.", filled: true },
  { id: "kids-sofgania", sku: "AD-BUILD-KIDS-SOFGANIA",    name: "Kids Size Sofgania", folder: "kids_size_sofgania_boston", slug: "kids_sofgania_boston", family: "sky",      note: "A small one, still filled.", filled: true },
  { id: "twist",         sku: "AD-BUILD-TWIST",            name: "Twist",              folder: "twist",                     slug: "twist",                family: "magenta",  note: "Braided, glazed end to end." },
  { id: "heart",         sku: "AD-BUILD-HEART",            name: "Heart Shape",        folder: "heart_shape_donuts",        slug: "heart_donut",          family: "sunshine", note: "For the occasion you know about." },
  { id: "bites",         sku: "AD-BUILD-BITES",            name: "Amazing Bites",      folder: "amazing_bites",             slug: "amazing_bites",        family: "sky",      note: "One bite. Then eleven more." },
  { id: "cupcake",       sku: "AD-BUILD-CUPCAKE",          name: "Cupcakes",           folder: "cupcakes",                  slug: "cupcake",              family: "magenta",  note: "Cake, in a paper collar." },
  { id: "mini-cupcake",  sku: "AD-BUILD-MINI-CUPCAKE",     name: "Mini Cupcakes",      folder: "mini_cupcakes",             slug: "mini_cupcake",         family: "sunshine", note: "Two bites, tops." },
  { id: "cookie-2",      sku: "AD-BUILD-COOKIE-2",         name: '2" Cookie',          folder: "cookie_2in",                slug: "cookie_2in",           family: "sky",      note: "Small, flat, iced." },
  { id: "cookie-3",      sku: "AD-BUILD-COOKIE-3",         name: '3" Cookie',          folder: "cookie_3in",                slug: "cookie_3in",           family: "magenta",  note: "The printing size." },
  { id: "cookie-lg",     sku: "AD-BUILD-COOKIE-LARGE",     name: "Large Cookie",       folder: "large_cookie",              slug: "cookie_large",         family: "sunshine", note: "Big enough to share. Nobody does." }
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
  { id: "gold",       name: "Gold Flakes",            shape: "flake",  colors: ["#D8A62B", "#F1CE6A"] },
  { id: "green",      name: "Green",                  shape: "jimmy",  colors: ["#3EA65B"] },
  { id: "orange",     name: "Orange",                 shape: "jimmy",  colors: ["#EE8B33"] },
  { id: "pink",       name: "Pink",                   shape: "jimmy",  colors: ["#E86FA4"] },
  { id: "purple",     name: "Purple",                 shape: "jimmy",  colors: ["#8E5BB0"] },
  { id: "rainbow",    name: "Rainbow",                shape: "jimmy",  colors: ["#2F7FD4", "#3EA65B", "#F4CE4A", "#E86FA4", "#EE8B33"] },
  { id: "candy",      name: "Round Candies",          shape: "bead",   colors: ["#2FB6C4", "#F4CE4A", "#EE8B33", "#DE4B57"] },
  { id: "whip",       name: "Whipped Cream",          shape: "swirl",  colors: ["#FFFBF3"], parve: true },
  { id: "whip-color", name: "Colored Whipped Cream",  shape: "swirl",  colors: ["#F09EC2", "#B9E0F0", "#F4CE4A"], parve: true, asksColour: true },
  { id: "silver",     name: "Silver Flakes",          shape: "flake",  colors: ["#C9CDD2", "#EEF1F4"] },
  { id: "white",      name: "White",                  shape: "jimmy",  colors: ["#FFFFFF"] },
  { id: "yellow",     name: "Yellow",                 shape: "jimmy",  colors: ["#F4CE4A"] },
  { id: "none",       name: "No Sprinkles",           shape: null,     colors: [], bare: true }
];

/* Fillings — sofgania and Boston only. */
export const FILLINGS = [
  { id: "custard",   name: "Custard",           key: "custard",   swatch: "#F6DFA0" },
  { id: "lemon",     name: "Lemon",             key: "lemon",     swatch: "#F3D65B" },
  { id: "raspberry", name: "Raspberry",         key: "raspberry", swatch: "#C42B55" },
  { id: "blueberry", name: "Blueberry",         key: "blueberry", swatch: "#4B4B96" },
  { id: "caramel",   name: "Caramel",           key: "caramel",   swatch: "#B87333" },
  { id: "ganache",   name: "Ganache",           key: "ganache",   swatch: "#4A2C1D" },
  { id: "nutella",   name: "Notella · Nut Free",key: "nutella",   swatch: "#6B4028" },
  { id: "none",      name: "No Filling",        key: null,        swatch: null, bare: true }
];

/* --- The rules from the sheet -------------------------------------------
   One place. If the bakery changes what goes with what, it changes here. */

const FILLABLE = new Set(["sofgania", "kids-sofgania"]);
const NO_GOLD  = new Set(["twist", "mini-cupcake", "cookie-2"]);
const PRINTABLE = new Set(["round"]);          /* 3" round print, round donut only */

export const RULES = {
  /* Sofgania / Boston only. */
  takesFilling: (baseId) => FILLABLE.has(baseId),

  /* Gold flakes: not on Twist, Mini Cupcakes or 2" Cookies. */
  sprinkleAllowed: (baseId, sprinkleId) => !(sprinkleId === "gold" && NO_GOLD.has(baseId)),

  /* No icing means nothing to hold a sprinkle on. */
  takesSprinkles: (icingId) => icingId !== "none",

  /* Upload-your-own is a 3" round print. */
  takesPrint: (baseId) => PRINTABLE.has(baseId),

  /* Why a thing is greyed out — shown on the chip, so nobody has to guess. */
  sprinkleReason: (baseId, sprinkleId, icingId) => {
    if (icingId === "none") return "Needs icing to stick to";
    if (sprinkleId === "gold" && NO_GOLD.has(baseId)) return "Not on this one";
    return null;
  }
};

/* --- Layer paths ---------------------------------------------------------
   Sprinkle art is still in progress. Flip TOPPING_ART to true once
   /assets/builder/toppings/topping_<id>.png exist and the layer draws itself. */
export const TOPPING_ART = false;

export const baseArt    = (base) => `${ART}/${base.folder}/base_${base.slug}.png`;
export const icingArt   = (base, icing) =>
  icing && icing.key ? `${ART}/${base.folder}/icing_${base.slug}_${icing.key}.png` : null;
export const fillingArt = (base, filling) =>
  filling && filling.key && RULES.takesFilling(base.id)
    ? `${ART}/${base.folder}/filling_${base.slug}_${filling.key}.png`
    : null;
export const toppingArt = (sprinkle) =>
  TOPPING_ART && sprinkle && !sprinkle.bare ? `${ART}/toppings/topping_${sprinkle.id}.png` : null;

export const byId = (list, id) => list.find((x) => x.id === id) || null;

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
