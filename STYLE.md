# Amazing Donuts — style guide

Reverse-engineered from the build in `site/`, not from the original brand doc.
Every number here was read out of the code, so this describes what the site
**actually does** — including the places where the implementation made a call
the brand doc did not cover.

Where a rule exists because breaking it caused a visible bug, that is said
plainly. Those are the ones worth obeying.

`CLAUDE.md` covers how to run and build the project. This covers what to make
it look like.

---

## 1. The two sources of truth

Tokens are declared **twice**, on purpose:

| File | Holds | Used by |
| --- | --- | --- |
| `src/index.css` `:root` | CSS custom properties | stylesheets, `var(--x)` in inline styles |
| `src/components/brand/tokens.ts` | the same values as TS constants | inline styles that compose (rings, strokes, gradients) |

They exist in both places so a component can build a `box-shadow` ring in JS
without a round-trip through a stylesheet. **They mirror each other — edit one
and you must edit the other, or they drift.** Change colour or type in
`index.css` first, then reflect it in `tokens.ts`.

---

## 2. Colour — Palette 03 · Harbour

Six brand colours. There is no seventh.

| Token | CSS | TS | Hex | Role |
| --- | --- | --- | --- | --- |
| Harbour | `--navy` | `C.navy` | `#0E3E69` | the ink; navbar, footer, outlines |
| Canvas | `--cream` | `C.canvas` | `#FBF7EF` | page background |
| Shortbread | `--sand` | `C.cream` | `#F7EEE0` | cards, photo beds, stages |
| Bubblegum | `--pink` | `C.pink` | `#FBBFEC` | party + seasonal surfaces, **active state** |
| Signal | `--blue` | `C.blue` | `#4790FE` | special order, **focus rings** |
| Dare Devil | `--orange` | `C.orange` | `#FF6832` | one hero moment per screen |

> ⚠ The CSS and TS names for Shortbread disagree: `--sand` is `C.cream`. A
> historical mismatch, not a mistake to fix casually — `C.cream` is referenced
> widely. Read the hex, not the name.

### Text colours

| Token | Hex | Use |
| --- | --- | --- |
| `--text-body` / `C.body` | `#274866` | body copy on canvas |
| `--text-muted` / `C.mute` | `#35597C` | **the lightest colour allowed on words** (6.8:1) |
| `--text-price` / `C.price` | `#B33A11` | prices |
| `--text-on-navy` | `#B9CBDC` | secondary copy on a navy ground |

**Never put type on anything lighter than `--text-muted`.** That is the floor,
and it is a contrast floor, not a taste one.

### The Dare Devil rule

`--orange` is **one hero moment per screen**. One primary button, or one
orange panel — not both. When a second call to action shares a screen it takes
`variant="outline"` (navy ink outline), which is why the homepage hero pairs an
orange button with an outlined one.

This rule bit once already: 30 star icons rendered in orange across the
testimonial cards would have been thirty hero moments, so the stars are navy.
When something needs emphasis and orange is spent, use Bubblegum or navy.

---

## 3. Type

**Two faces. There is no third.**

| Face | Stack | Weights | Use |
| --- | --- | --- | --- |
| NCL Qikober | `--font-display` / `F.qikober` | **400 only** | display headings |
| Karla | `--font-body`, `--font-cta`, `--font-label` / `F.display`, `F.text` | 400, 500, 700, 800 | everything else |

Qikober is self-hosted (`public/fonts/NCLQikober-Regular.ttf`); Karla comes
from Google Fonts, linked in every HTML entry.

### Display headings are uppercase, globally

`index.css` sets `h1, h2, h3` to Qikober 400 **uppercase** for the whole site.
Source text is written mixed case ("Have an amazing morning.") and *renders*
uppercase. So a display heading needs no `text-transform` of its own — and
removing one will not make it mixed case, because the global rule still wins.
If you genuinely need a mixed-case heading, you have to override it explicitly.

### The Qikober weight rule

**Never set a weight above 400 on Qikober.** There is only one weight in the
file, so the browser synthesises a fake bold and the letterforms smear.
Anything that needs to *look* bold is Karla 700/800 — that is what `F.display`
is for, despite the name.

### Loading Qikober — and why the fallback matters more than it looks

Qikober is **very** condensed. Ten cap-H at 100px, measured in the browser:

| Face | Width | vs Qikober |
| --- | --- | --- |
| **NCL Qikober** | **323px** | — |
| Haettenschweiler | 380px | +18% |
| Anton | 499px | +54% |
| Impact | 555px | +72% |
| Arial Narrow / Archivo Narrow | 592px | +83% |
| Karla | 669px | +107% |
| Arial / generic `sans-serif` | 722px | **+124%** |

So a fallback is not a cosmetic stand-in: at +124% a two-line `--type-hero`
headline wraps to four lines and then snaps back when Qikober lands. That is a
reflow, not a restyle, and it is exactly the slack the `--type-hero` comment
warns about.

Three things keep it under control, all of them already in place:

1. **Serve WOFF2 first.** `NCLQikober-Regular.woff2` is 25kB against the TTF's
   88kB. The `src` list is woff2 → woff → ttf; the browser takes the first
   format it supports, so putting the TTF earlier would hand it 88kB for
   nothing.
2. **Preload it in every HTML entry.**
   `<link rel="preload" as="font" type="font/woff2" crossorigin>`. Without it
   the font is only discovered after the CSS is fetched and parsed and the
   `@font-face` is matched — several round trips too late.
3. **Fall back to a condensed face.** The display stack is
   `'NCL Qikober', Impact, 'Haettenschweiler', 'Karla', sans-serif`. Impact and
   Haettenschweiler are local on Windows/macOS, so they cost no request — which
   is why a Google font is the *wrong* answer here: it would be one more thing
   that has not arrived at first paint.

`font-display` is currently `swap`, so the fallback shows immediately. `block`
would hide the headings briefly instead — no wrong-width flash, but blank
headings on a slow connection. That trade-off has not been decided.

There is also a `NCLQikober-Slant.woff2` in the v3 project. It is the oblique
and is **not** used; do not wire it up as if it were the Regular.

### Scale

Base 18px, ratio 1.25, with the small end pinned off-ratio (15/13) because the
brand table rounds it that way.

| Token | Size | Face / notes |
| --- | --- | --- |
| `--fs-label` | 13px | Karla 700, tracked, uppercase |
| `--fs-small` | 15px | Karla 400 |
| `--fs-body` | 18px | Karla 400, line-height 1.6 |
| `--fs-sub` | 22.5px | Karla 700, 1.3 |
| `--fs-swatch` | 28px | Qikober, 1.1–1.15 |
| `--fs-card` | 35px | Qikober, 1.1 |
| `--fs-h2alt` | 44px | Qikober, 1.05 |
| `--fs-h2` | 55px | Qikober, 1.1 |
| `--fs-h1` | 69px | Qikober, 1.0 |
| `--fs-display` | 107px | Qikober, 0.95 |

### Role sizes — use these, not the raw steps

Fluid between two scale steps and capped at a step the table names, so nothing
can exceed the system:

```css
--type-hero:            clamp(44px, 19vw, 134px);
--type-section:         clamp(var(--fs-h2alt), 7vw,   var(--fs-h2));
--type-card-title:      clamp(var(--fs-h2alt), 9.5vw, var(--fs-h2));
--type-card-heading:    clamp(var(--fs-h2alt), 5vw,   var(--fs-h2));
--type-card-heading-sm: clamp(var(--fs-swatch), 4vw,  var(--fs-h2alt));
--type-cert:            clamp(var(--fs-sub),   3vw,   var(--fs-swatch));
```

`--type-hero` is the one deliberate exception: it is sized to **fill its line**
rather than to a scale step. At 19vw the longer of its two lines lands at
94–97% of the text column across phone widths — the widest it can go and still
break into exactly two lines, with enough slack that font-rendering variance
cannot tip it to four. **Read that comment before touching the number.**

Line heights are tokens too (`--lh-display: .95` through `--lh-body: 1.6`).
Display type sets tight; body sets at 1.6.

---

## 4. Shape

| Token | Value | Use |
| --- | --- | --- |
| `--radius-panel` / `R.panel` | 28px | cards, panels |
| `--radius-card-l` / `R.cardL` | 32px | the large product card |
| `--radius-chip` / `R.chip` | 24px | chips, step rows |
| `--radius-pill` / `R.pill` | 999px | pills, buttons, badges |

Large decorative panels (footer, feature cards, banners) use **44px** directly
rather than a token — a fourth radius that never got one. Follow the
neighbours.

### The squircle

Photo beds and product tiles clip to a squircle, not a rounded rectangle:

```jsx
style={{ clipPath: SQUIRCLE }}   // 'url(#squircle-clip)'
```

**`<SquircleDefs />` must be mounted once in the tree** or the URL does not
resolve and the clip silently does nothing. Every page shell already mounts it
— if you add a page, mount it.

---

## 5. Layout

The page shell, used by all six pages:

```jsx
maxWidth: 1240,
margin: '0 auto',
padding: 'clamp(24px,4vw,56px) clamp(18px,4vw,40px)'
```

`maxWidth: 1240` and the `clamp(18px,4vw,40px)` gutter each appear 11 times
across the components. New sections match them.

`--nav-h: clamp(60px, 6.5vw, 78px)` is the sticky bar's height. It is a token
because the Donut Lab sizes its builder as `calc(100dvh - var(--nav-h))` and
needs the number, not a guess. **`Header.tsx` and `DonutLabPage.tsx` both read
this token — never re-declare the clamp.**

Use `dvh`, never `vh`, for anything full-height: on mobile the collapsing URL
bar hides the bottom of a `vh` layout.

### Section rhythm

`--gap-section-y: clamp(16px, 2vw, 32px)` and `--gap-section-y-lg`. Under
560px a mobile block overrides `--gap-heading: 18px` and `--gap-band: 20px`, so
every section heading sits the same distance above what it introduces. That
block uses `!important` deliberately — it is overriding inline styles, which is
the only way to reach them.

---

## 6. Components

### Buttons — `BrandButton`

Three variants, and the choice is semantic:

| Variant | Fill | When |
| --- | --- | --- |
| `primary` | Dare Devil, white text | the screen's one hero action |
| `outline` | transparent, navy 2px inset ring | every other action on that screen |
| `signal` | Signal blue, white text | special order only |

Renders an `<a>` when given `href`, a `<button>` otherwise — so a form submit
just omits `href`. It has a sprinkle-burst on click (16 sprinkles on a jittered
radial, from the five palette colours).

### Chips — the active-state language

One pattern, used in three places: the navbar's active nav item, the
catalogue's collection filters, and the bulk form's answer pills.

- **Selected:** `background: var(--pink)`, no ring, navy text.
- **Unselected:** transparent, `inset 0 0 0 1.5px rgba(14,62,105,.24)`.
- Type on Bubblegum is always navy — it is too light for cream.

In the navbar the chip is a single element with a shared motion `layoutId`, so
it *slides* between items rather than fading out and in. Copy that if you add
another chip row that tracks a selection.

Segmented controls are chips too — the checkout's pickup/delivery and
card/account selectors, and the Donut Lab's "how many of these?" row all use the
same filled/outlined pairing. If a control expresses one choice from a few, it
is a chip.

### Inverted panels

A navy panel with Canvas ink is an established pattern, not a one-off: the
footer, the account nav, the careers "Nothing here fits?" block and the
checkout's order summary all use it. It marks a panel as *different in kind*
from the form or content around it.

When inverting:

- Body ink becomes `--cream`; secondary copy becomes **`--text-on-navy`**
  (`#B9CBDC`). Do **not** reuse `--text-muted` — it is tuned for a light ground
  and fails contrast on navy.
- Hairline dividers flip to `rgba(251, 247, 239, .18)`.
- **Photo beds stay light.** Product images are transparent cut-outs and
  disappear against navy, so their bed keeps `--cream`.

### No single-side accent rules

Do not mark a panel with a one-sided stripe — no `border-left: 4px`, no
`border-top` cap, no inset edge bar. The fill, the radius and the type are what
make a panel read as a panel. Several of these accumulated on the commerce
pages and were removed; the pattern is not in the system.

Functional hairline **dividers** between rows or under a bar are fine — those
separate content rather than decorate a container.

### Form fields

One spec, used by the contact, bulk-order and checkout forms:

```css
min-height: 52px;
padding: 0 16px;              /* 13px 16px for a textarea */
border: 0;
border-radius: 16px;
box-shadow: inset 0 0 0 2px rgba(14, 62, 105, .2);
background: var(--cream);     /* Canvas, so it reads as an inset in a Shortbread card */
```

Field labels are Karla 700 at `--fs-label`, tracked `.06em`, uppercase, navy.

There is **no error or warning colour in the palette.** Build errors from
`--text-price` (Brick) over a 10% wash of itself; warnings use Shortbread with a
hairline. Do not import a new red or amber.

⚠ **`<legend>` does not sit inside its fieldset's padding.** It is laid out on
the top edge, so in a padded panel it lands flush against the frame while every
other container's heading is inset. `float: left; width: 100%` takes it out of
that special layout — then clear the float on the next sibling
(`legend + * { clear: both }`), because a float pushes inline content down but
not block siblings, and the first control will otherwise overlap it.

### Badges

`Badge` (merchandising + diet) and `KosherBadge` (certification). Diet badges
read as **outlines** so merchandising keeps the solid fills. The kosher marks
are white-only artwork that must sit on a solid Harbour ground and **must never
be recoloured** — an earlier pass masked them to pick up `currentColor`, which
is exactly what the spec forbids.

---

## 7. Motion

### The house curve

```
cubic-bezier(0.22, 1, 0.36, 1)
```

Declared as `const EASE` in four components and used for essentially every
entrance, slide and reveal. Use it unless there is a reason not to.

Secondary curves in real use: `cubic-bezier(0.2, 0.8, 0.2, 1)` for presses,
`cubic-bezier(0.34, 1.3, 0.44, 1)` where something should overshoot.

### Durations

- Micro-feedback (press): **120ms**, `transform: scale(0.97)`
- Colour/state change: **180–250ms**
- Entrance / slide / panel: **300–450ms**
- Set pieces (preloader hand-off, claw sequence): **520ms–2500ms**

### Press and lift

`.brand-press` on anything tappable — 120ms, `scale(0.97)` on `:active`.
`.brand-lift` for hover elevation — `translateY(-2px)`.

### Three motion rules learned the hard way

**1. Animate `transform` and `opacity`. Everything else is a last resort.**
The preloader's hand-off was written as a per-frame JS timeline and got **six
frames in 2.5 seconds** on a first page load, because the main thread is at its
busiest exactly then. A wall-clock timeline starved of frames does not run
slowly — it *skips*. It is now two CSS transitions on the compositor. Likewise
the navbar search animated `width` through motion and read as janky; it is a
CSS transition now.

**2. If a sequence has phases, give every element the same duration and put the
easing inside the keyframes.** That is how the claw sequence works: one
`--claw-t`, `linear` on every element, `animation-timing-function` per
keyframe. Phases then cannot drift, and retiming the whole thing is one number.

**3. Percentage geometry needs a square.** The claw's numbers are percentages
of a square; the stage is `aspect-ratio: 1` capped by `max-height: 100%`, so on
a phone it is landscape and every percentage sheared. Anything laid out in
percentages of a container needs that container's aspect pinned, or measured.

### Reduced motion

Every animated component honours `prefers-reduced-motion: reduce` — ten files
implement it. The convention is to **collapse durations to `0.01ms` rather than
remove the animation**, so multi-step sequences still land on their final
frame instead of never starting.

---

## 8. Accessibility floors

- **Focus:** `outline: 3px solid var(--blue)`, `outline-offset: 2px`. Signal
  blue is the focus colour everywhere; do not restyle per component.
- **Contrast:** nothing lighter than `--text-muted` on words.
- **Tap targets:** 44px minimum. Icon buttons are 48×48; form pills and rows
  are `min-height: 44px`; the builder's rail pills are 52px.
- **Real controls:** the chip pills wrap a real `<input type="radio|checkbox">`
  positioned off-screen at 1×1px rather than reimplementing selection with
  divs and aria. Keep doing that.
- **Hidden interactive elements get `tabIndex={-1}`** so a keyboard user cannot
  tab into something translated off-screen (the navbar search field, the
  product page's sticky buy bar).
- **Alt text describes the frame, not the caption.** Decorative art is
  `aria-hidden`. If a gallery cannot accept alt text per image, that is a
  reason to pick a different gallery.

---

## 9. Page architecture

**Six static HTML entries, no router.** Each page is its own Vite input:

| URL | Entry |
| --- | --- |
| `/` | `index.html` → `src/main.tsx` |
| `/shop/` | `shop/index.html` → `src/pages/shop-entry.tsx` |
| `/donut-lab/` | `donut-lab/index.html` → `src/pages/donut-lab-entry.tsx` |
| `/contact/` | `contact/index.html` → `src/pages/contact-entry.tsx` |
| `/careers/` | `careers/index.html` → `src/pages/careers-entry.tsx` |
| `/bulk-orders/` | `bulk-orders/index.html` → `src/pages/bulk-orders-entry.tsx` |

A separate entry keeps the build fully static and stops each page paying for
the others' code. **Nav items point at pages, not at homepage anchors** — the
nav used to point at `#favorites` teasers, which went nowhere on any page but
the homepage.

### The page shell

Every page repeats the same wrapper, and a new one should too:

```jsx
<NavThemeProvider>
  <ShopProvider>
    <SquircleDefs />
    <div style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
      <Header onSignIn={...} />
      <main>…</main>
      <Footer ready />
    </div>
    <CartDrawer />
    <AuthModal … />
  </ShopProvider>
</NavThemeProvider>
```

`<Footer ready />` — `ready` is the homepage preloader's hand-off flag. Pages
without a preloader pass it as `true` so the footer starts settled.

Each entry also needs: its own `<title>` as `Page · Amazing Donuts`, a
`<meta name="description">`, the Karla font link, and `theme-color="#0e3e69"`.

### Header colour per section

`nav-theme.tsx` lets a section claim the bar's colours while it owns the
**middle of the viewport** (`innerHeight / 2`), via `useNavClaimAtMidpoint`.
The earlier test was "has this section's first pixel slid under the bar", which
fired while the section was still mostly off-screen. Sections do not overlap
vertically, so exactly one can straddle the midline and last-claim-wins never
has to arbitrate.

---

## 10. Imagery

- **Product cut-outs are square canvases that are roughly half padding.**
  Measured: the donut fills 46–54% of the frame. Before using one at a
  meaningful size — in a headline, in a row — **trim it to its alpha bounding
  box**, or you are scaling empty space. Trimmed copies live beside the
  originals (`/img/petite/`, `zap-donut-trimmed.webp`) and are typically 4–5×
  smaller as WebP.
- **WebP for everything new.** The builder's art went PNG → WebP for 47.2MB →
  4.6MB. Reel covers went 6MB → 2.5MB.
- **Product photos are `object-fit: contain` with `transform: scale(1.14–1.18)`**
  on their bed, so the cut-out fills the squircle without cropping.
- **The WebGL carousel builds a texture per item up front**, so every extra
  card costs ~2MB of GPU memory whether or not anyone scrolls to it. Twelve is
  the working limit; do not feed it a whole gallery.

---

## 11. Copy voice

Short sentences. Concrete nouns. A dry joke is welcome; a superlative is not.

- "Hand-cut and decorated every morning since '97."
- "One bite. Then eleven more."
- "Big enough to share. Nobody does."

Two things the build is careful about, and new copy should be too:

- **No claim the bakery cannot stand behind.** The petite-donut card is framed
  as "get a full taste" rather than anything implying low-calorie — a bakery
  claiming a donut is healthy invites a challenge it cannot win.
- **Say what a control does, not what happened.** The Lab's print step reads
  "Upload", not "Skipped": the pill is read *before* the step is reached, and
  calling it skipped announces the outcome of a choice nobody has made yet.

---

## 12. Quick checklist for a new page or section

1. Tokens from `index.css` / `tokens.ts` — no raw hex, no ad-hoc font stacks.
2. Two faces only; Qikober at weight 400.
3. One Dare Devil moment; everything else outlined.
4. `maxWidth: 1240` + `clamp(18px,4vw,40px)` gutter.
5. Radius from the token set; squircle for photo beds, with `<SquircleDefs />`
   mounted.
6. `EASE = cubic-bezier(0.22, 1, 0.36, 1)`; animate transform/opacity.
7. `prefers-reduced-motion` handled, durations collapsed not removed.
8. Focus ring `3px solid var(--blue)`, offset 2px; 44px tap targets.
9. Nothing lighter than `--text-muted` on words.
10. New page → new HTML entry + `vite.config.ts` input + title + description +
    the Qikober preload link.
11. No single-side accent stripes; inverted panels use `--text-on-navy`.
