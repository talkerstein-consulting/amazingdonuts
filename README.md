# Amazing Donuts — React build

The same homepage as `../site`, rebuilt as React components. Same CSS, same
assets, same copy; the difference is that the interactive parts are components
with state instead of DOM scripting.

## Run

```
npm install
npm run dev      # http://localhost:5189
npm run build    # dist/
```

## React Bits blocks

Installed with the Pro CLI and then rewritten in place for the brand — every one
kept its layout, rhythm and motion, and lost its shadows, gradients and neutral
palette (the system has none of those).

| Block | Becomes | Notes |
|---|---|---|
| `hero-24` | the hero | shader background swapped for the bakery photograph; rolling headline and wedge CTAs kept |
| `showcase-6` | the donut slider | tilted card strip turned into a scroll-snapped rail with left/right nav |
| `ecommerce-4` | the product cabinet | product page turned into a right-hand slide-out; adds to the box |
| `features-12` | Reasons to buy | lucide icons animate on hover instead of the card taking a shadow |
| `contact-9` | Visit | right panel is a live Google map; today's hours row is highlighted |
| `footer-5` | the footer | Deep Ink panel, family-coloured bars, bakery links |

Tailwind v4 is installed for these blocks, **without preflight** — see
`src/styles/tailwind.css`. Preflight would reset the brand stylesheet.

## Layout

```
src/
  App.jsx                     page order + the shared box reducer
  components/
    Wedge.jsx                 the brand CTA (ground layer + rolling label)
    Masthead.jsx              nav, with the mobile toggle
    hero-24.tsx               the hero, on the bakery photograph
    Roller.jsx                the rolling last line of the headline
    SprinkleButton.jsx        round button, FREE SPRINKLES ring on hover
    Ticker.jsx                the scrolling strips
    BoxBuilder.jsx            twelve-slot box + the tray of picks
    IndecisionMachine.jsx     three reels, the lever, the chute
    showcase-6.tsx            the donut slider
    ecommerce-4.tsx           the product cabinet (slide-out)
    features-12.tsx           reasons to buy, animated icons
    contact-9.tsx             visit details + Google map
    footer-5.tsx              the footer
    Sections.jsx              certifications, categories, printing, ink panel
  hooks/
    useOpenNow.js             bakery hours in America/Toronto, re-checked each minute
    useSprinkles.js           confetti (particles live outside the React tree on purpose)
    useReducedMotion.js       live prefers-reduced-motion
  lib/catalogue.js            product lookups and the category helpers
  data/products.js            generated from image_urls.csv + the PNG cutouts
  styles/                     styles.css and home.css, copied from ../site
```

## Notes

- The box state lives in `App.jsx` as a reducer, so the Indecision Machine can
  drop its result straight into a slot, and two clicks in the same tick both land.
- `public/assets/` is a copy of `../site/assets`. The trimmed source PNGs live in
  `../site/assets/cutouts-png` and are not shipped here.
- The hero photograph is `public/assets/hero/hero-donuts.jpg`. The file there now
  is a stand-in composed from the real cutouts — drop the final photograph in at
  that path to swap it, no code change needed.
- Brand rules still apply: no shadows, no gradients, no opacity fades. Motion is
  transform-only on `cubic-bezier(.34,1.56,.64,1)`.
