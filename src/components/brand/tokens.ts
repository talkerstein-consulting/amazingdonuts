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
  body: '#274866',   // body copy on canvas
  mute: '#35597C',   // the lightest colour allowed on words (6.8:1)
  price: '#B33A11'   // price text
} as const;

/** All text is Red Hat for now — Display for majors, Text for minors. */
export const F = {
  display: "'Red Hat Display', system-ui, sans-serif",
  text: "'Red Hat Text', system-ui, sans-serif"
} as const;

/**
 * Squircle geometry. The shape is a clip-path, so `<SquircleDefs />` has to be
 * mounted once somewhere in the tree for `url(#squircle-clip)` to resolve.
 */
export const SQUIRCLE = 'url(#squircle-clip)';

/** Card corner radius — the squircle's flat-sided cousin, used on rectangles. */
export const RADIUS = 28;
