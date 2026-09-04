import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Donut,
  Dessert,
  Cake,
  Cookie,
  Wheat,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  Flame,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ArrowDownAZ
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CATEGORIES, PRODUCTS, type Category, type Product } from '../data/products';
import { LAB_HREF } from '../lib/lab-href';
import { useGridColumns } from '../hooks/useGridColumns';
import { readShopParams } from '../lib/shop-href';
import { Badge, C, F, SQUIRCLE, BadgeRow } from '../components/brand';
import { tagFor } from '../data/product-tags';
import { useShop, useBoxQty } from '../lib/shop';
import AddControl from '../components/AddControl';
import SortMenu, { type SortOption } from './SortMenu';

/**
 * The catalogue: banner, the card straddling its bottom edge, category chips,
 * and the product grid.
 *
 * This used to be a full-screen overlay carrying its own bar and a filter rail
 * of checkboxes beside the grid. It is now the body of `/shop/` — the global
 * navbar sits above it, so it needs no bar of its own, and the filters are a
 * single scrolling row of chips rather than a column of checkboxes.
 *
 * Why chips beat the checkboxes here: five categories in a vertical rail cost
 * a whole column of width on desktop and a tall accordion on a phone, to
 * express what is really one question with a handful of answers. A row of
 * chips reads as that question, works identically at every width, and puts the
 * grid at the top of the page where it belongs.
 */

/**
 * The banner behind the card, per collection.
 *
 * Each one is a supplied photograph, centre-cropped to 16:9 and resized to
 * 1920x1080 webp. Donuts and "Shop all" share one photograph — it arrived named
 * "donuts and all" — so the two are byte-identical files rather than one path
 * used twice, which keeps them independent if either is ever re-shot.
 *
 * The card covers the middle of these, so what survives is the left and right
 * of the frame — worth knowing if any of them are ever re-cropped.
 */
const BANNERS: Record<'all' | Category, string> = {
  all: '/img/category/all.webp',
  Donuts: '/img/category/donuts.webp',
  Muffins: '/img/category/muffins.webp',
  Cupcakes: '/img/category/cupcakes.webp',
  Cookies: '/img/category/cookies.webp',
  Breads: '/img/category/breads.webp'
};

/** Alt text per banner. Never the collection name — the heading already says
    that, and a screen reader would hear it twice. */
const BANNER_ALT: Record<'all' | Category, string> = {
  all: 'Rows of sprinkled and chocolate-glazed donuts, hearts and stars on a blue counter',
  Donuts: 'Rows of sprinkled and chocolate-glazed donuts, hearts and stars on a blue counter',
  Muffins: 'A tray of freshly baked muffins',
  Cupcakes: 'Hand-iced cupcakes lined up on the counter',
  Cookies: 'An assortment of iced and filled cookies',
  Breads: 'Braided challah and loaves cooling from the oven'
};

/**
 * What the card says, per collection.
 *
 * The card is the page's only prose, so it carries the heading a search engine
 * reads and the sentence it quotes — hence a real line per category rather
 * than one generic blurb with the name swapped in. Every claim here is one the
 * bakery already makes on the homepage and in the page's meta description:
 * baked daily, kosher, Toronto since 1997. Nothing new is asserted.
 */
/**
 * A glyph per collection, so the chips are scannable before they are read.
 *
 * Lucide has no muffin, so Muffins takes `Dessert` — a domed baked thing on a
 * plate, which is the nearest true shape. Breads takes `Wheat` rather than
 * `Croissant`: the collection is challah and everyday loaves, and a croissant
 * would name a thing the bakery does not sell.
 */
const COLLECTION_ICON: Record<'all' | Category, LucideIcon> = {
  all: LayoutGrid,
  Donuts: Donut,
  Muffins: Dessert,
  Cupcakes: Cake,
  Cookies: Cookie,
  Breads: Wheat
};

/**
 * Donuts split in two, because 25 of them in one row of tiles buries the $2
 * everyday case under the $75 centrepieces.
 *
 * The line is drawn at $5 because the catalogue draws it there itself: donuts
 * run $1.50 to $3.00 and then jump straight to $12. Nothing sits between, so
 * this is the sheet's own gap rather than a threshold invented to look tidy.
 * If the bakery ever prices something into that gap, revisit the number.
 */
const SPECIAL_OVER = 5;

/**
 * The "you dream it" banner spans every column and occupies the third row, so
 * it goes in after exactly two full rows of products.
 *
 * Two rows is a different number of tiles at every width — 4, 6 or 8 — so the
 * index is computed from the live column count rather than being a constant.
 * It was a single square tile pinned to one cell, which put it at the end of
 * row two on desktop and somewhere arbitrary everywhere else.
 */
const PROMO_ROW = 2;

/**
 * Collections the Donut Lab banner is withheld from.
 *
 * The Lab's twelve shapes are donuts, sofganiyot, twists, hearts, bites,
 * cupcakes and cookies. There is no muffin among them and no bread, so on those
 * two counters the banner invites you to customise something the builder cannot
 * make. Checked against `BASES` in `donut-lab-stable/builder-data.ts` — if a
 * shape is ever added there, take the matching category out of here.
 */
const NO_PROMO = new Set<Category>(['Breads', 'Muffins']);

/**
 * How a tile enters and leaves when the collection changes: in from the right,
 * out to the left. The same direction the rest of the site moves in, so a
 * filter change reads as the next set arriving rather than the current set
 * rearranging itself in place — which is what the old fade-up looked like.
 *
 * The stagger is capped: a 60-item grid must not leave its tail waiting on a
 * delay that grows with the index.
 */
const slide = (i: number) => ({
  initial: { opacity: 0, x: 48 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -48 },
  transition: {
    layout: { type: 'spring' as const, stiffness: 260, damping: 30 },
    duration: 0.35,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    delay: Math.min(i, 12) * 0.02
  }
});

/**
 * What can sit in the grid.
 *
 * Three kinds rather than just products: the Lab promo has been a grid child
 * since it became a full-width banner, and the counter dividers join it. Both
 * span every column, so the grid's row flow does the placement and neither
 * needs to know how many columns there are.
 */
type Tile =
  | { kind: 'product'; product: Product }
  | { kind: 'promo' }
  | { kind: 'heading'; category: Category };

/** `"$2.00"` → `2`. The catalogue stores price as display text. */
const priceValue = (p: Product) => Number(p.price.replace(/[^0-9.]/g, '')) || 0;

type Tier = 'classic' | 'special';

/**
 * How the grid is ordered.
 *
 * Sixty items, most of them $2.00 donuts that look alike in a thumbnail, is a
 * lot to ask someone to read in catalogue order — and catalogue order is the
 * order the scrape produced, which is nobody's shopping order. The pieces
 * worth the most (the $75 letter cake, the $45 printed dozen, the $35 donut
 * cake) sit wherever the CSV left them, well down a list most visitors never
 * reach the end of.
 *
 * `featured` is still the default, because the hand-set tags and the run order
 * are a merchandising decision rather than a default to overturn quietly. The
 * other three are the ones people actually ask a bakery list for.
 *
 * Every comparator is total and stable: `sort` is called on a copy, and ties
 * fall back to catalogue position so a re-sort never reshuffles equal items
 * under the layout animation.
 */
type Sort = 'featured' | 'popular' | 'price-asc' | 'price-desc' | 'az';

const SORTS: SortOption<Sort>[] = [
  { id: 'featured', label: 'Featured', icon: Sparkles },
  { id: 'popular', label: 'Most popular', icon: Flame },
  { id: 'price-asc', label: 'Price: low to high', icon: ArrowUpNarrowWide },
  { id: 'price-desc', label: 'Price: high to low', icon: ArrowDownWideNarrow },
  { id: 'az', label: 'A – Z', icon: ArrowDownAZ }
];

/* Best sellers first, then the softer "popular" tag, then everything else —
   the same two tiers the badges already show, so the sort agrees with what is
   printed on the tiles rather than inventing a ranking of its own. */
const TAG_RANK: Record<string, number> = { seller: 0, popular: 1 };
const rankOf = (p: Product) => {
  const tag = tagFor(p.id);
  return tag ? TAG_RANK[tag] ?? 2 : 2;
};

const TIERS: { id: Tier; label: string; test: (p: Product) => boolean }[] = [
  { id: 'classic', label: 'Classic', test: (p) => priceValue(p) <= SPECIAL_OVER },
  { id: 'special', label: 'Special', test: (p) => priceValue(p) > SPECIAL_OVER }
];

const COLLECTION_COPY: Record<'all' | Category, { title: string; seo: string }> = {
  all: {
    title: 'Shop all',
    seo: 'Every donut, muffin, cupcake, cookie and bread we prepare is hand-cut, decorated and made in our own kosher kitchen in Toronto.'
  },
  Donuts: {
    title: 'Donuts',
    seo: 'Filled, glazed and sprinkled kosher donuts — sofganiyot, Boston creme and classic rings — prepared and finished by hand in Toronto.'
  },
  Muffins: {
    title: 'Muffins',
    seo: 'Full-size kosher muffins prepared in our Toronto bakery, from everyday breakfast flavours to the ones worth a detour.'
  },
  Cupcakes: {
    title: 'Cupcakes',
    seo: 'Hand-iced kosher cupcakes for birthdays, simchas and Tuesday afternoons — decorated to order in our Toronto bakery.'
  },
  Cookies: {
    title: 'Cookies',
    seo: 'Kosher cookies prepared in Toronto — by the piece or by the box, for gifting, sharing or keeping to yourself.'
  },
  Breads: {
    title: 'Breads',
    seo: 'Challah and everyday kosher breads, braided by hand in Toronto and prepared in time for Shabbos.'
  }
};

export default function ShopAll() {
  const { openProduct } = useShop();
  /* Which products are already in the box, so the grid can say so. */
  const boxQty = useBoxQty();
  const openCatalogProduct = (product: Product) => openProduct(product.id);
  /* Opened from a homepage lane or the footer menu, the URL says which counter
     to show. Read in the lazy initialiser, not an effect: an effect would paint
     the unfiltered grid first and then visibly filter it. */
  const [active, setActive] = useState<Category | null>(() => readShopParams().category);
  /* The header's search lands here as `?q=`. `readShopParams` has always
     returned it; nothing read it, so a search arrived and changed nothing. */
  const [query, setQuery] = useState(() => readShopParams().query);
  const [sort, setSort] = useState<Sort>('featured');
  /** Only ever set while Donuts is the active collection. */
  const [tier, setTier] = useState<Tier | null>(() => {
    const params = readShopParams();
    return params.category === 'Donuts' ? params.tier : null;
  });

  const shown = useMemo(() => {
    const inCategory = active ? PRODUCTS.filter((p) => p.category === active) : PRODUCTS;
    const inTier =
      active !== 'Donuts' || !tier ? inCategory : inCategory.filter(TIERS.find((t) => t.id === tier)!.test);
    if (!query) return inTier;
    /* Matched against the name and the category, case-insensitively, on every
       whitespace-separated word: "blue sprinkle" should find the blue sprinkle
       donut, and searching "bread" should find the Breads counter's items even
       though no product is literally called bread. */
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return inTier.filter((p) => {
      const hay = `${p.name} ${p.category}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [active, tier, query]);

  /* Sorted separately from the filtering above so a re-sort does not re-run
     the search. Catalogue position is the tiebreak throughout — see SORTS. */
  const ordered = useMemo(() => {
    if (sort === 'featured') return shown;
    const at = new Map(PRODUCTS.map((p, i) => [p.id, i]));
    const tie = (a: Product, b: Product) => at.get(a.id)! - at.get(b.id)!;
    const copy = [...shown];
    if (sort === 'popular') copy.sort((a, b) => rankOf(a) - rankOf(b) || tie(a, b));
    else if (sort === 'price-asc') copy.sort((a, b) => priceValue(a) - priceValue(b) || tie(a, b));
    else if (sort === 'price-desc') copy.sort((a, b) => priceValue(b) - priceValue(a) || tie(a, b));
    else copy.sort((a, b) => a.name.localeCompare(b.name) || tie(a, b));
    return copy;
  }, [shown, sort]);

  /* Leaving Donuts has to drop the tier with it, or Muffins would come back
     silently filtered by a control that is no longer on screen. */
  const pickCategory = (next: Category | null) => {
    setActive(next);
    if (next !== 'Donuts') setTier(null);
  };

  const columns = useGridColumns();

  const countFor = (category: Category) => PRODUCTS.filter((p) => p.category === category).length;

  /* Grouped only while the grid is showing everything.
     A picked category is already one group and the banner above it says which,
     so a heading there would repeat the page title. A search is a relevance
     list that happens to span counters — cutting it into five labelled runs
     would bury the best match under a subheading. */
  const grouped = !active && !query;

  /* The grid is products, one promo tile, and — when grouped — a divider ahead
     of each counter's run. Building the whole list up front means every one of
     them is a real grid child with a stable key, so they all take part in the
     same layout animation instead of the dividers jumping while the tiles
     animate around them. */
  const tiles = useMemo<Tile[]>(() => {
    const items: Tile[] = ordered.map((product) => ({ kind: 'product' as const, product }));

    if (grouped) {
      const out: Tile[] = [];
      CATEGORIES.forEach((category) => {
        /* Filtered out of the sorted list, so each counter's run carries the
           chosen order inside it rather than the grid losing its grouping the
           moment anything but Featured is picked. */
        const inGroup = ordered.filter((p) => p.category === category);
        if (!inGroup.length) return;
        out.push({ kind: 'heading' as const, category });
        inGroup.forEach((product) => out.push({ kind: 'product' as const, product }));
        /* After the donuts, which is the counter the Lab actually customises
           and the longest run on the page — far enough in to have earned the
           interruption, and on a group boundary so it never splits a run. */
        if (category === 'Donuts') out.push({ kind: 'promo' as const });
      });
      return out;
    }

    // Nothing to customise on these counters — see NO_PROMO.
    if (active && NO_PROMO.has(active)) return items;
    const at = Math.min(columns * PROMO_ROW, items.length);
    return [...items.slice(0, at), { kind: 'promo' as const }, ...items.slice(at)];
  }, [ordered, columns, active, grouped]);

  /* Filtering the grid re-titles the page: picking Cookies makes this the
     cookies collection, not "Shop all" with a filter applied. */
  const copy = COLLECTION_COPY[active ?? 'all'];

  return (
    <div className="shop-page">
      {/* --- banner ------------------------------------------------------- */}
      <section className="shop-banner" aria-labelledby="shop-heading">
        <div className="shop-banner__media">
          {/* The banner travels the same way the tiles below it do: the next
              collection arrives from the right while the last one leaves to the
              left. Both are absolutely positioned so they overlap during the
              pass — otherwise the band would show its own empty background
              between the two photographs.

              `initial={false}` because this should read as a change of
              collection, not as an entrance: on first load the banner is simply
              already there. */}
          <AnimatePresence initial={false}>
            <motion.img
              key={active ?? 'all'}
              src={BANNERS[active ?? 'all']}
              alt={BANNER_ALT[active ?? 'all']}
              width={1920}
              height={1080}
              className="shop-banner__img"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              /* Slower than a tile: it crosses the whole viewport, not 48px. */
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
        </div>

        {/* Narrower than the banner and centred on its bottom edge — part over
            the image, part over the page. That overlap is what ties the two
            together; fully inside it would read as a caption, fully below as a
            separate block.

            The overlap is a fixed negative margin rather than a translated
            absolute box. Half-its-own-height looks right until the card is
            tall — on a phone the legitimacy marks wrap to three rows, and half
            of that is deeper than the banner itself, so the card swallowed the
            image it was supposed to sit on. A fixed pull straddles the edge the
            same way at every height. */}
        <div className="shop-banner__card">
          <h1 id="shop-heading" className="shop-banner__title">{copy.title}</h1>
          <p className="shop-banner__note">{copy.seo}</p>

          {/* The legitimacy marks: certification first — it is the claim people
              actually come to check — then the free-from set. One compact
              outlined row, so they read as supporting detail under the copy
              rather than competing with the heading.

              These are icon pills, not the supplied COR/פרווה/ישן artwork. That
              artwork is white-only and must never be recoloured, so it cannot
              be outlined on a cream card at any size — see BADGES in Badge.tsx.
              `KosherBadge` still carries the real marks on the navy marquee. */}
          <div className="shop-banner__marks">
            <BadgeRow
              badges={['cor', 'pareve', 'yoshon', 'nut', 'dairy', 'sesame']}
              forceOutline
              compact
              gap={6}
            />
          </div>
        </div>
      </section>

      {/* --- filters and sort --------------------------------------------- */}
      {/* One row: the counters on the left, the order on the right. They were
          two rows with an item count between them, which spent a whole line of
          the page on a number nobody shops by — sixty is not a reason to buy
          anything — and separated the two halves of a single question, which is
          "show me these, in this order".

          The rule under the row is the page's one structural line: above it,
          everything that changes what the grid holds; below it, the grid. */}
      <div className="shop-toolbar">
      {/* One row, scrolling sideways when it runs out of room. Same control at
          every width, so there is no separate phone treatment to keep in sync.

          Icon and name, not icon alone. Stripping the names did buy the row
          enough width to fit on a phone without scrolling, and cost more than
          it bought: five bakery glyphs are not five distinguishable words —
          muffin and cupcake in particular — and on a phone there is no hover to
          fall back on. The row scrolls; that is what it is built to do. */}
      <div className="shop-chips" role="group" aria-label="Filter by category">
        <button
          type="button"
          onClick={() => pickCategory(null)}
          aria-pressed={active === null}
          className={`shop-chip${active === null ? ' is-on' : ''}`}
        >
          <LayoutGrid size={16} strokeWidth={2.5} aria-hidden="true" />
          All
          <span className="shop-chip__count">{PRODUCTS.length}</span>
        </button>

        {CATEGORIES.map((category) => {
          const Icon = COLLECTION_ICON[category];
          return (
          <button
            key={category}
            type="button"
            /* Tapping the active chip clears it, so the row needs no separate
               'clear' control - which the checkbox rail did. */
            onClick={() => pickCategory(active === category ? null : category)}
            aria-pressed={active === category}
            className={`shop-chip${active === category ? ' is-on' : ''}`}
          >
            <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
            {category}
            <span className="shop-chip__count">{countFor(category)}</span>
          </button>
          );
        })}
      </div>

        <SortMenu value={sort} options={SORTS} onChange={setSort} />
      </div>

      {/* The tier row only exists while Donuts is up, so it is a second line
          rather than two more chips in the first — the main row must not
          reshuffle its width every time a collection is picked. */}
      {active === 'Donuts' && (
        <div className="shop-chips shop-chips--sub" role="group" aria-label="Filter donuts by kind">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier((prev) => (prev === t.id ? null : t.id))}
              aria-pressed={tier === t.id}
              className={`shop-chip shop-chip--sub${tier === t.id ? ' is-on' : ''}`}
            >
              {t.label}
              <span className="shop-chip__count">
                {PRODUCTS.filter((p) => p.category === 'Donuts' && t.test(p)).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* The search, and the way out of it. This is all that is left of the
          count line: "60 items" said nothing, but a page silently showing six
          products because a query is still in the header has to say why, and
          has to offer a way back. */}
      {query && (
        <p className="shop-query">
          Showing {shown.length} of {PRODUCTS.length} for{' '}
          <strong style={{ color: C.navy }}>&ldquo;{query}&rdquo;</strong>{' '}
          <button type="button" onClick={() => setQuery('')} className="shop-query__clear">
            clear
          </button>
        </p>
      )}

      {/* A search that matches nothing has to say so. Without this the grid
          just came up empty and read as a broken page. */}
      {query && shown.length === 0 && (
        <p className="shop-query shop-query--empty">
          Nothing matches &ldquo;{query}&rdquo;. Try a flavour, or{' '}
          <button type="button" onClick={() => setQuery('')} className="shop-query__clear">
            see everything
          </button>
          .
        </p>
      )}

      {/* --- grid --------------------------------------------------------- */}
      <div className="shop-grid">
        <AnimatePresence mode="popLayout">
          {tiles.map((tile, i) =>
            tile.kind === 'heading' ? (
              /* A divider, not a section: the products stay in one grid so the
                 columns line up across every counter. Five separate grids
                 would each solve their own last row and the page would step in
                 and out as the runs ended on different counts. */
              <motion.h2
                key={`heading-${tile.category}`}
                id={`counter-${tile.category.toLowerCase()}`}
                layout
                className="shop-divider"
                {...slide(i)}
              >
                {/* The name and the rule, nothing else. The icon repeated the
                    one already on this counter's chip a few rows up, and the
                    count is a number nobody is shopping by — the products it
                    counts start on the next line. */}
                <span className="shop-divider__name">{tile.category}</span>
                <span className="shop-divider__rule" aria-hidden="true" />
              </motion.h2>
            ) : tile.kind === 'promo' ? (
              <motion.article
                key="promo"
                layout
                className="shop-promo"
                {...slide(i)}
              >
                {/* The homepage's Lab card, re-cut as a banner across the whole
                    grid. As a single square tile it was one pink cell in a row
                    of donuts — the same size and shape as the things it was
                    meant to interrupt, so it read as a product with a strange
                    photo. Full width gives it a different job on the page.

                    Two links rather than one wrapping both halves: an anchor
                    around a block this size is an unwieldy hit target and reads
                    as one enormous link to a screen reader. */}
                <a href={LAB_HREF} className="shop-promo__art" aria-hidden="true" tabIndex={-1}>
                  <img src="/img/babka.png" alt="" loading="lazy" />
                </a>

                <div className="shop-promo__body">
                  <h3 className="shop-promo__title">You dream it, we make it.</h3>
                  <p className="shop-promo__copy">
                    Custom donuts and cookies made for birthdays, brands, parties, and very
                    important inside jokes.
                  </p>
                  <a href={LAB_HREF} className="shop-promo__cta">
                    Try the donut lab
                    <ChevronRight size={16} strokeWidth={3} />
                  </a>
                </div>
              </motion.article>
            ) : (
            <motion.article
              key={tile.product.id}
              layout
              {...slide(i)}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => openCatalogProduct(tile.product)}
                  aria-label={`View ${tile.product.name}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    aspectRatio: '1',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    /* See the homepage grid: the bed carries the state,
                       because a ring on a squircle-clipped element is clipped
                       away with it. */
                    background: boxQty[tile.product.id] ? C.orange : C.canvas,
                    clipPath: SQUIRCLE,
                    overflow: 'hidden',
                    transition: 'background .2s ease'
                  }}
                >
                  <img
                    src={tile.product.img}
                    alt={tile.product.name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `scale(${tile.product.id === 'heart-shape-donut' || tile.product.id === 'star-of-david-donut-special-order' ? 0.82 : 1.18})`
                    }}
                  />
                </button>

                <AddControl product={tile.product} />
              </div>

              <button
                type="button"
                onClick={() => openCatalogProduct(tile.product)}
                style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
              >
                {/* Markup-wise the tag belongs to the text, not to the photo,
                    and `.product-tag` is what decides where it is drawn: over
                    the picture's top-left corner on a wide grid, and in the
                    flow above the name on a phone — see the rule. It cannot be
                    two elements, because a duplicated badge is read twice. */}
                {tagFor(tile.product.id) && (
                  <span className="product-tag">
                    <Badge badge={tagFor(tile.product.id)!} compact />
                  </span>
                )}
                <h4
                  style={{
                    margin: 0,
                    fontFamily: F.display,
                    /* Karla at 800 made every product name shout; the card's job is
                       to be scanned, and a grid of extra-bold names has no
                       hierarchy left in it. */
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: 1.2,
                    color: C.navy,
                    textTransform: 'none',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {tile.product.name}
                </h4>
                <span style={{ fontFamily: F.text, fontWeight: 500, fontSize: 13, color: C.price }}>{tile.product.price}</span>
              </button>
            </motion.article>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
