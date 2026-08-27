/**
 * Catalogue and rules for the Donut Lab.
 *
 * The data and the rules are the ones from the original builder — the full
 * twelve-shape availability sheet, its base groupings and its RULES engine.
 * The interface that renders them is the stable single-viewport builder.
 *
 * Every restriction from the sheet lives in `RULES` at the bottom. Nothing
 * else in the builder hard-codes an exception.
 *
 * Art is WebP: `assets/<folder>/base_<slug>.webp`,
 * `icing_<slug>_<key>.webp`, `filling_<slug>_<key>.webp`, plus one
 * `topping_<slug>.svg` sprinkle mask per shape.
 */

export const ART = '/assets/builder';

export type Base = {
  id: string;
  /** Full menu name, used in the readout line. */
  name: string;
  folder: string;
  slug: string;
  note: string;
  /**
   * The shape's size relative to the frame. The stage transforms to this, so
   * switching between e.g. the three cookies grows or shrinks smoothly
   * instead of cutting from one art file straight to the next.
   */
  scale: number;
  /** Sofgania and Boston only — the shapes with room for a filling. */
  filled?: boolean;
};

export type Icing = { id: string; name: string; key: string | null; swatch: string | null; bare?: boolean };
export type Filling = { id: string; name: string; key: string | null; swatch: string | null; bare?: boolean };
export type Sprinkle = { id: string; name: string; colors: string[]; bare?: boolean };

export const BASES: Base[] = [
  { id: 'round',         name: 'Round Donut',        folder: 'round_donut',               slug: 'round_donut',          note: 'The one people picture.',           scale: 1 },
  { id: 'kids-round',    name: 'Kids Size Round',    folder: 'kids_size_round',           slug: 'kids_round',           note: 'Same donut, smaller hands.',        scale: 0.72 },
  { id: 'sofgania',      name: 'Sofgania / Boston',  folder: 'sofgania_boston',           slug: 'sofgania_boston',      note: 'No hole. Room for filling.',        scale: 1, filled: true },
  { id: 'kids-sofgania', name: 'Kids Size Sofgania', folder: 'kids_size_sofgania_boston', slug: 'kids_sofgania_boston', note: 'A small one, still filled.',        scale: 0.72, filled: true },
  /* 0.87, not 1: the twist is the one shape drawn wider than it is tall. Its
     ink spans 872 of the art's 1024px against the round donut's 760, so at
     scale 1 the stage's 1.2 crop factor pushed it past both edges and the
     braid's ends were clipped. 0.87 gives it the same margin the round donut
     has (872/1024 × 1.2 × 0.87 ≈ 760/1024 × 1.2). */
  { id: 'twist',         name: 'Twist',              folder: 'twist',                     slug: 'twist',                note: 'Braided, glazed end to end.',       scale: 0.87 },
  { id: 'heart',         name: 'Heart Shape',        folder: 'heart_shape_donuts',        slug: 'heart_donut',          note: 'For the occasion you know about.',  scale: 0.95 },
  { id: 'bites',         name: 'Amazing Bites',      folder: 'amazing_bites',             slug: 'amazing_bites',        note: 'One bite. Then eleven more.',       scale: 0.5 },
  { id: 'cupcake',       name: 'Cupcakes',           folder: 'cupcakes',                  slug: 'cupcake',              note: 'Cake, in a paper collar.',          scale: 0.85 },
  { id: 'mini-cupcake',  name: 'Mini Cupcakes',      folder: 'mini_cupcakes',             slug: 'mini_cupcake',         note: 'Two bites, tops.',                  scale: 0.55 },
  { id: 'cookie-2',      name: '2" Cookie',          folder: 'cookie_2in',                slug: 'cookie_2in',           note: 'Small, flat, iced.',                scale: 0.5 },
  { id: 'cookie-3',      name: '3" Cookie',          folder: 'cookie_3in',                slug: 'cookie_3in',           note: 'The printing size.',                scale: 0.72 },
  { id: 'cookie-lg',     name: 'Large Cookie',       folder: 'large_cookie',              slug: 'cookie_large',         note: 'Big enough to share. Nobody does.', scale: 1 }
];

/** `swatch` drives the colour dot; `key` is the filename fragment. */
export const ICINGS: Icing[] = [
  // Pink leads: it is the builder's default, and the default should be the
  // first thing the rail shows rather than something you scroll to find.
  { id: 'pink',      name: 'Vanilla · Pink',       key: 'vanilla_pink',      swatch: '#F09EC2' },
  { id: 'blue',      name: 'Vanilla · Blue',       key: 'vanilla_blue',      swatch: '#7FC5E8' },
  { id: 'lightblue', name: 'Vanilla · Light Blue', key: 'vanilla_lightblue', swatch: '#B9E0F0' },
  { id: 'orange',    name: 'Vanilla · Orange',     key: 'vanilla_orange',    swatch: '#F0913C' },
  { id: 'purple',    name: 'Vanilla · Purple',     key: 'vanilla_purple',    swatch: '#B48AC8' },
  { id: 'red',       name: 'Vanilla · Red',        key: 'vanilla_red',       swatch: '#DE4B57' },
  { id: 'white',     name: 'Vanilla · White',      key: 'vanilla_white',     swatch: '#FBF7F0' },
  { id: 'yellow',    name: 'Vanilla · Yellow',     key: 'vanilla_yellow',    swatch: '#F4CE4A' },
  { id: 'chocolate', name: 'Chocolate',            key: 'chocolate_glaze',   swatch: '#7B4A2D' },
  { id: 'none',      name: 'No Icing',             key: null,                swatch: null, bare: true }
];

/**
 * Fillings — sofgania and Boston only. "None" leads, since skipping a filling
 * is at least as common a choice as picking one.
 *
 * `chocolate` is included even though the original sheet omitted it: the art
 * exists in every filled shape's folder, so leaving it out looked like an
 * oversight rather than a rule.
 */
export const FILLINGS: Filling[] = [
  { id: 'none',      name: 'No Filling',         key: null,        swatch: null, bare: true },
  { id: 'custard',   name: 'Custard',            key: 'custard',   swatch: '#F6DFA0' },
  { id: 'lemon',     name: 'Lemon',              key: 'lemon',     swatch: '#F3D65B' },
  { id: 'raspberry', name: 'Raspberry',          key: 'raspberry', swatch: '#C42B55' },
  { id: 'blueberry', name: 'Blueberry',          key: 'blueberry', swatch: '#4B4B96' },
  { id: 'caramel',   name: 'Caramel',            key: 'caramel',   swatch: '#B87333' },
  { id: 'ganache',   name: 'Ganache',            key: 'ganache',   swatch: '#4A2C1D' },
  { id: 'chocolate', name: 'Chocolate',          key: 'chocolate', swatch: '#5A3520' },
  { id: 'nutella',   name: 'Notella · Nut Free', key: 'nutella',   swatch: '#6B4028' }
];

/** One topping mask per shape, recoloured from these palettes. */
export const SPRINKLES: Sprinkle[] = [
  { id: 'rainbow',   name: 'Rainbow',      colors: ['#2F7FD4', '#3EA65B', '#F4CE4A', '#E86FA4', '#EE8B33'] },
  { id: 'blue',      name: 'Blue',         colors: ['#2F7FD4'] },
  { id: 'chocolate', name: 'Chocolate',    colors: ['#5A3520'] },
  { id: 'green',     name: 'Green',        colors: ['#3EA65B'] },
  { id: 'orange',    name: 'Orange',       colors: ['#EE8B33'] },
  { id: 'pink',      name: 'Pink',         colors: ['#E86FA4'] },
  { id: 'purple',    name: 'Purple',       colors: ['#8E5BB0'] },
  { id: 'white',     name: 'White',        colors: ['#FFFFFF'] },
  { id: 'yellow',    name: 'Yellow',       colors: ['#F4CE4A'] },
  { id: 'none',      name: 'No Sprinkles', colors: [], bare: true }
];

/**
 * Some bases are really "the same thing, a different size", so they are
 * grouped under one thumbnail rather than shown as three near-identical
 * cookies side by side. The underlying `baseId` is unchanged either way, so
 * RULES and the art paths never need to know groups exist.
 */
export type BaseGroup = {
  key: string;
  memberIds: string[];
  name: string;
  note: string;
  sizeNames: Record<string, string>;
};

export const BASE_GROUPS: BaseGroup[] = [
  {
    key: 'round',
    memberIds: ['round', 'kids-round'],
    name: 'Round Donut',
    note: 'The one people picture.',
    sizeNames: { round: 'Regular', 'kids-round': 'Kids Size' }
  },
  {
    key: 'sofgania',
    memberIds: ['sofgania', 'kids-sofgania'],
    name: 'Sofgania / Boston',
    note: 'No hole. Room for filling.',
    sizeNames: { sofgania: 'Regular', 'kids-sofgania': 'Kids Size' }
  },
  {
    key: 'cupcake',
    memberIds: ['cupcake', 'mini-cupcake'],
    name: 'Cupcakes',
    note: 'Cake, in a paper collar.',
    sizeNames: { cupcake: 'Regular', 'mini-cupcake': 'Mini' }
  },
  {
    key: 'cookie',
    memberIds: ['cookie-2', 'cookie-3', 'cookie-lg'],
    name: 'Cookie',
    note: 'Small, flat, iced.',
    sizeNames: { 'cookie-2': '2" Cookie', 'cookie-3': '3" Cookie', 'cookie-lg': 'Large Cookie' }
  }
];

export type ShapeItem =
  | { type: 'single'; key: string; name: string; note: string; base: Base; members: Base[] }
  | { type: 'group'; key: string; name: string; note: string; base: Base; members: Base[]; sizeNames: Record<string, string> };

/**
 * Flattens BASES into the list the shape rail renders: grouped members
 * collapse into a single entry at their first occurrence, so the order still
 * matches the sheet; everything else passes through on its own.
 *
 * `base` is the representative shown on the tile — the first member.
 */
export function buildShapeItems(bases: Base[] = BASES): ShapeItem[] {
  const groupedIds = new Set(BASE_GROUPS.flatMap((g) => g.memberIds));
  const seen = new Set<string>();
  const items: ShapeItem[] = [];

  for (const b of bases) {
    if (!groupedIds.has(b.id)) {
      items.push({ type: 'single', key: b.id, name: b.name, note: b.note, base: b, members: [b] });
      continue;
    }
    const group = BASE_GROUPS.find((g) => g.memberIds.includes(b.id))!;
    if (seen.has(group.key)) continue;
    seen.add(group.key);
    const members = group.memberIds.map((id) => byId(bases, id));
    items.push({
      type: 'group',
      key: group.key,
      name: group.name,
      note: group.note,
      base: members[0],
      members,
      sizeNames: group.sizeNames
    });
  }
  return items;
}

/** The shape-rail entry a given base belongs to. */
export const itemForBase = (baseId: string): ShapeItem =>
  buildShapeItems().find((it) => it.members.some((m) => m.id === baseId)) || buildShapeItems()[0];

/* --- The rules from the sheet ---------------------------------------------
   One place. If the bakery changes what goes with what, it changes here. */

const FILLABLE = new Set(['sofgania', 'kids-sofgania']);
/**
 * Upload-your-own: a round print, on the full-size round donut and the
 * full-size cupcake.
 *
 * Not the kids' round and not the mini cupcake — same reasoning either way:
 * the print is a fixed-size disc the bakery actually prints, and the small
 * versions have no face wide enough to take one.
 */
const PRINTABLE = new Set(['round', 'cupcake']);

/**
 * Where the print sits on the stage, as percentages of the square art canvas.
 *
 * A donut is drawn face-up, so its print lands dead centre. A cupcake is drawn
 * with the icing in the top two-thirds and the paper collar below, so a centred
 * disc would be printed on the wrapper. `top` is the centre of each shape's
 * icing measured off the art (cupcake icing spans y 187-667, centre 427 of
 * 1024 = 42%), and `size` keeps the disc the same fraction of the icing's width
 * on both shapes, which is why the cupcake's is the smaller number.
 */
export const printSpot = (baseId: string) =>
  baseId === 'cupcake' ? { top: 42, size: 31 } : { top: 50, size: 34 };

export const RULES = {
  /** Sofgania / Boston only. */
  takesFilling: (baseId: string) => FILLABLE.has(baseId),

  /** No icing means nothing to hold a sprinkle on. */
  takesSprinkles: (icingId: string) => icingId !== 'none',

  takesPrint: (baseId: string) => PRINTABLE.has(baseId),

  /** Why a thing is unavailable — shown on the tile, so nobody has to guess. */
  sprinkleReason: (icingId: string) => (icingId === 'none' ? 'Needs icing to stick to' : null)
};

/* --- Layer paths ---------------------------------------------------------- */

export const baseArt = (base: Base) => `${ART}/${base.folder}/base_${base.slug}.webp`;

export const icingArt = (base: Base, icing?: Icing) =>
  icing && icing.key ? `${ART}/${base.folder}/icing_${base.slug}_${icing.key}.webp` : null;

export const fillingArt = (base: Base, filling?: Filling) =>
  filling && filling.key && RULES.takesFilling(base.id)
    ? `${ART}/${base.folder}/filling_${base.slug}_${filling.key}.webp`
    : null;

/* One sprinkle-topping graphic per base shape — it stands in for whichever
   colour is picked, since the art isn't drawn per-colour. */
export const toppingArt = (base: Base, sprinkle?: Sprinkle) =>
  sprinkle && !sprinkle.bare ? `${ART}/${base.folder}/topping_${base.slug}.svg` : null;

/* --- Helpers -------------------------------------------------------------- */

export const byId = <T extends { id: string }>(list: T[], id: string): T =>
  list.find((x) => x.id === id) || list[0];

export const cssUrl = (src: string) => `url("${src}")`;

/**
 * Deterministic 0–1 from an index. The sprinkle drop needs scatter that is
 * stable across re-renders, so `Math.random()` is out — the same mark must
 * always land at the same moment or the stagger reshuffles on every paint.
 */
export const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The stacked art for a combination: filling-or-base underneath, icing on
 * top. Sprinkles are not here — they are an inline recoloured SVG, painted
 * separately so each mark can animate.
 */
export const stack = (b: Base, ic?: Icing, f?: Filling) => {
  const out = [{ img: cssUrl(fillingArt(b, f) || baseArt(b)) }];
  const isrc = icingArt(b, ic);
  if (isrc) out.push({ img: cssUrl(isrc) });
  return out;
};

/* --- Steps ---------------------------------------------------------------- */

export type StepId = 'base' | 'size' | 'icing' | 'filling' | 'sprinkle' | 'print';

export const STEP_LABEL: Record<StepId, string> = {
  base: 'Shape',
  size: 'Size',
  icing: 'Icing',
  filling: 'Filling',
  sprinkle: 'Sprinkles',
  print: 'Print'
};

export const STEP_TITLE: Record<StepId, string> = {
  base: 'Pick a shape',
  size: 'Pick the size',
  icing: 'Pick the icing',
  filling: 'Pick the filling',
  sprinkle: 'Pick the sprinkles',
  print: 'Print your own'
};

/**
 * The line under the step title. Straight from the original builder — and no
 * longer rendered: the builder dropped it from every stage, because the title
 * and the rail beneath it already say what the choice governs. Kept here, like
 * the prices, so putting it back is a one-line change.
 */
export const STEP_NOTES: Record<StepId, string> = {
  base: 'Twelve shapes. The rest of the choices follow from this one.',
  size: 'Same shape, different size.',
  icing: 'Colour first. Everything else sits on top of it.',
  filling: 'Sofgania and Boston get an inside.',
  sprinkle: 'Last layer. Some are held back by the shape you picked.',
  print: 'A round print, on a round donut or a cupcake. Send the artwork, we bake it.'
};

/**
 * Which steps exist right now. Membership is derived from the rules, so a
 * pick can add or remove a step — which is why the current index has to be
 * clamped rather than trusted.
 *
 * `size` only appears for a grouped shape, which is how the original
 * builder's base groups survive into a single-viewport interface: instead of
 * a second row inside the shape step, the sizes get a step of their own.
 */
export const stepsFor = (b: Base, ic: Icing): StepId[] => {
  const list: StepId[] = ['base'];
  if (itemForBase(b.id).members.length > 1) list.push('size');
  list.push('icing');
  if (RULES.takesFilling(b.id)) list.push('filling');
  if (RULES.takesSprinkles(ic.id)) list.push('sprinkle');
  return list;
};

/* --- Copy ----------------------------------------------------------------- */

/** Short label for a tile or a pill, where the full menu name will not fit. */
export const shortName = (name: string) =>
  name.replace('Vanilla · ', '').replace(' · Nut Free', '').replace(/^No /, 'No ');

/**
 * The line under the stage. It reads the build back to you.
 * e.g. "Round Donut — pink, filled with custard, under rainbow."
 */
export function describe({
  base,
  icing,
  filling,
  sprinkle,
  printOn
}: {
  base: Base;
  icing: Icing;
  filling: Filling;
  sprinkle: Sprinkle;
  printOn: boolean;
}) {
  const bits: string[] = [];

  if (icing.bare) bits.push('bare');
  else bits.push(icing.name.replace('Vanilla · ', '').toLowerCase());

  if (RULES.takesFilling(base.id) && !filling.bare) {
    bits.push(`filled with ${filling.name.replace(' · Nut Free', '').toLowerCase()}`);
  }
  if (RULES.takesSprinkles(icing.id) && !sprinkle.bare) {
    bits.push(`under ${sprinkle.name.toLowerCase()}`);
  }
  if (printOn) bits.push('with your own artwork on top');

  if (!bits.length) return base.name;
  return `${base.name} — ${bits.join(', ')}.`;
}
