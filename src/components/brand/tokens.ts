/**
 * Palette 03 · Harbour — the token set the brand components read from.
 *
 * These mirror the CSS custom properties already declared in `src/index.css`;
 * they exist in TS as well so the components can compose colours inline
 * (box-shadow rings, icon strokes) without a Tailwind round-trip.
 */
export const C = {
  navy: '#0E3E69',   // Harbour — the ink
  canvas: '#FBF7EF', // Canvas — app background
  cream: '#F7EEE0',  // Shortbread — cards, photo beds
  pink: '#FBBFEC',   // Bubblegum — party + seasonal surfaces
  blue: '#4790FE',   // Signal — special order, focus rings
  orange: '#FF6832', // Dare Devil — one hero moment per screen
  /* Dare Devil at 12%, for the photo bed of a product already in the box. A
     tint rather than the colour itself: the bed sits behind the product, and
     the spec allows one hero moment per screen. */
  orangeWash: '#FFEDE6',
  body: '#274866',   // body copy on canvas
  mute: '#35597C',   // the lightest colour allowed on words (6.8:1)
  price: '#B33A11'   // price text
} as const;

/**
 * Brand system v5: NCL Qikober for display, Karla for everything else — the
 * doc is explicit that there is no third face.
 *
 * `qikober` is the display face and has ONE weight (400). Never set a
 * font-weight above 400 on it: the browser synthesises a fake bold and the
 * letterforms smear. Anything that needs to be bold — card titles, working
 * headings, button labels — is Karla 700/800, which is what `display` is for.
 */
export const F = {
  /** The display face. Weight 400 only. */
  qikober: "'NCL Qikober', 'Karla', sans-serif",
  /** Karla, for bold UI type. Named `display` for the callers that predate v5. */
  display: "'Karla', system-ui, sans-serif",
  /** Karla, for body and small copy. */
  text: "'Karla', system-ui, sans-serif"
} as const;

/**
 * Squircle geometry. The shape is a clip-path, so `<SquircleDefs />` has to be
 * mounted once somewhere in the tree for `url(#squircle-clip)` to resolve.
 */
export const SQUIRCLE = 'url(#squircle-clip)';

/** Card corner radius — the squircle's flat-sided cousin, used on rectangles. */
export const RADIUS = 28;

/** The v5 radius set. */
export const R = {
  panel: 28,
  cardL: 32,
  chip: 24,
  pill: 999
} as const;
