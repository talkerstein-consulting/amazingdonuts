import { useEffect, useMemo, useRef, useState } from 'react';
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
  ArrowDownAZ,
  SlidersHorizontal
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BOX_BUILDER_IDS, CATEGORIES, SHOP_PRODUCTS, type Category, type Product } from '../data/products';
import BoxCard from '../components/BoxCard';
import { LAB_HREF } from '../lib/lab-href';
import { useGridColumns } from '../hooks/useGridColumns';
import { readShopParams } from '../lib/shop-href';
import { FULFILLMENT_EVENT } from '../lib/fulfillment';
import { Badge, C, F, SQUIRCLE, BadgeRow } from '../components/brand';
import { tagFor } from '../data/product-tags';
import { useShop, useBoxQty } from '../lib/shop';
import AddControl from '../components/AddControl';
import CollectionRail from './CollectionRail';
import FilterDrawer, {
  FilterButton,
  type FilterOption,
  type SortOption
} from './FilterDrawer';

/**
 * The catalogue: banner, the card straddling its bottom edge, category chips,
 * and the product grid.
 *
 * This used to be a full-screen overlay carrying its own bar and a filter rail
 * of checkboxes beside the grid, and after that a toolbar of category chips
 * with a sort dropdown beside it. Everything that narrows the grid now lives
 * behind one pinned button — see `FilterDrawer` for why — so the page itself is
 * banner, then grid, and the controls travel with the visitor instead of
 * scrolling away above them.
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

/**
 * What the thing tastes of, which is the question the grid could not answer.
 *
 * Category says which counter, Kind says roughly what it costs. Neither says
 * chocolate. On a sixty-item list of near-identical thumbnails that is the one
 * thing most people arrive knowing — and until now the only way to ask it was
 * the search box, which means guessing the bakery's own wording: "creme" finds
 * the Boston, "cream" does not, and neither finds the custard-filled jelly.
 *
 * Matched on the product name, because that is the only flavour information the
 * catalogue carries — the scrape has no flavour column. So each family is a
 * list of the words the bakery actually spells it with, including the variants
 * that trip the search box up. Names match lowercased and un-anchored:
 * "Chocolate Chip Blondie Square" is chocolate, and should be.
 *
 * Deliberately not exhaustive. A family that would catch two items is a row
 * that costs more to read than it saves, so these are the seven that carve the
 * catalogue into runs worth browsing; anything they miss is still reachable by
 * every other route on the page.
 */
type Flavour = 'chocolate' | 'vanilla' | 'glazed' | 'sprinkles' | 'filled' | 'fruit' | 'spiced';

const FLAVOURS: { id: Flavour; label: string; words: string[] }[] = [
  { id: 'chocolate', label: 'Chocolate', words: ['chocolate', 'brownie', 'cookie crumb'] },
  { id: 'vanilla', label: 'Vanilla', words: ['vanilla', 'white marble', 'white powder'] },
  { id: 'glazed', label: 'Glazed & plain', words: ['glazed', 'marble', 'powder', 'plain'] },
  { id: 'sprinkles', label: 'Sprinkles', words: ['sprinkle'] },
  /* Every word the bakery uses for a filling, because it uses several: the
     Boston is spelled "Creme" on one listing and "Cream" on another. */
  { id: 'filled', label: 'Filled', words: ['jelly', 'custard', 'creme', 'cream', 'boston'] },
  {
    id: 'fruit',
    label: 'Fruit',
    words: ['strawberry', 'lemon', 'blueberry', 'banana', 'apple', 'cranberry', 'carrot']
  },
  {
    id: 'spiced',
    label: 'Caramel & spiced',
    words: ['caramel', 'cinnamon', 'cappuccino', 'snickerdoodle']
  }
];

const tasteOf = (id: Flavour) => {
  const words = FLAVOURS.find((f) => f.id === id)!.words;
  return (p: Product) => {
    const name = p.name.toLowerCase();
    return words.some((w) => name.includes(w));
  };
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
  const { openProduct, product: openPanel } = useShop();
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  /* The pin is not on screen over the banner. Up there the page has not begun —
     there is nothing yet to filter and the button would be a control floating
     over a photograph. It arrives as the grid does, level with the first
     counter heading, and stays for the rest of the page. */
  const [pinShown, setPinShown] = useState(false);
  const gridTop = useRef<HTMLDivElement | null>(null);
  /* Where the page furniture ends, so the pin can sit under it rather than on
     it. The navbar's height is a clamp and the pickup/delivery band is only
     there once a choice has been made, so the number differs between two
     otherwise identical screens — measured, not assumed. Re-read on resize,
     since the navbar's clamp is width-based, and on the fulfillment event,
     since that is what makes the band appear and disappear. */
  const [chromeBottom, setChromeBottom] = useState(0);

  useEffect(() => {
    const measure = () => {
      const bottoms = ['header', '.pickup-banner']
        .map((sel) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? 0)
        .filter((bottom) => bottom > 0);
      setChromeBottom(bottoms.length ? Math.max(...bottoms) : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener(FULFILLMENT_EVENT, measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener(FULFILLMENT_EVENT, measure);
    };
  }, []);
  /* Applies on every counter now, not just Donuts. It was pinned to Donuts
     because it lived in a chip row that appeared and vanished with the
     collection; inside the drawer it is a filter beside the others, and the
     price line it draws is one every counter has. */
  const [tier, setTier] = useState<Tier | null>(() => readShopParams().tier);
  const [flavour, setFlavour] = useState<Flavour | null>(null);

  const shown = useMemo(() => {
    const inCategory = active ? SHOP_PRODUCTS.filter((p) => p.category === active) : SHOP_PRODUCTS;
    const inTier = tier ? inCategory.filter(TIERS.find((t) => t.id === tier)!.test) : inCategory;
    const inFlavour = flavour ? inTier.filter(tasteOf(flavour)) : inTier;
    if (!query) return inFlavour;
    /* Matched against the name and the category, case-insensitively, on every
       whitespace-separated word: "blue sprinkle" should find the blue sprinkle
       donut, and searching "bread" should find the Breads counter's items even
       though no product is literally called bread. */
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return inFlavour.filter((p) => {
      const hay = `${p.name} ${p.category}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [active, tier, flavour, query]);

  /* Sorted separately from the filtering above so a re-sort does not re-run
     the search. Catalogue position is the tiebreak throughout — see SORTS. */
  const ordered = useMemo(() => {
    if (sort === 'featured') return shown;
    const at = new Map(SHOP_PRODUCTS.map((p, i) => [p.id, i]));
    const tie = (a: Product, b: Product) => at.get(a.id)! - at.get(b.id)!;
    const copy = [...shown];
    if (sort === 'popular') copy.sort((a, b) => rankOf(a) - rankOf(b) || tie(a, b));
    else if (sort === 'price-asc') copy.sort((a, b) => priceValue(a) - priceValue(b) || tie(a, b));
    else if (sort === 'price-desc') copy.sort((a, b) => priceValue(b) - priceValue(a) || tie(a, b));
    else copy.sort((a, b) => a.name.localeCompare(b.name) || tie(a, b));
    return copy;
  }, [shown, sort]);

  useEffect(() => {
    const el = gridTop.current;
    if (!el) return;
    /* A sentinel at the top of the grid rather than the banner itself: the
       banner is 16:9 and on a short laptop window it is still partly visible
       when the first products are, so "banner off screen" would hold the pin
       back well past the point it is wanted. */
    /* Shown once the sentinel has passed above the navbar, and hidden again on
       the way back up. `boundingClientRect.top < rootBounds.top` is what tells
       the two directions apart: not intersecting also describes a sentinel that
       is still below the fold, which is most of the first screen. */
    const io = new IntersectionObserver(
      ([entry]) =>
        setPinShown(
          !entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)
        ),
      { threshold: 0, rootMargin: '-96px 0px 0px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const columns = useGridColumns();

  /* Counts are what each choice would leave, not what the catalogue holds in
     total — a "Special 3" under a picked Cookies counter has to mean three
     cookies. Every count therefore honours the OTHER group's current answer,
     and never its own, so choosing within a group cannot change the numbers
     you were choosing between. */
  const narrow = (list: Product[], skip: 'category' | 'tier' | 'flavour') => {
    let out = list;
    if (active && skip !== 'category') out = out.filter((p) => p.category === active);
    if (tier && skip !== 'tier') out = out.filter(TIERS.find((t) => t.id === tier)!.test);
    if (flavour && skip !== 'flavour') out = out.filter(tasteOf(flavour));
    return out;
  };

  const countInCategory = (category: Category | null) => {
    const scope = category ? SHOP_PRODUCTS.filter((p) => p.category === category) : SHOP_PRODUCTS;
    return narrow(scope, 'category').length;
  };

  const countInTier = (id: Tier | null) => {
    const scope = id ? SHOP_PRODUCTS.filter(TIERS.find((t) => t.id === id)!.test) : SHOP_PRODUCTS;
    return narrow(scope, 'tier').length;
  };

  const countInFlavour = (id: Flavour | null) => {
    const scope = id ? SHOP_PRODUCTS.filter(tasteOf(id)) : SHOP_PRODUCTS;
    return narrow(scope, 'flavour').length;
  };

  /* The drawer's groups always have an answer, so "everything" is a real option
     inside each rather than the absence of one. `all` and `any` map back to the
     nulls the grid filters on. */
  const categoryOptions: FilterOption<Category | 'all'>[] = [
    /* "Shop all", not "Everything": the same words the nav link, the banner
       heading and the first tab of the category rail use for this exact state.
       Three names for one filter is three chances to think they are different
       things. */
    { id: 'all', label: 'Shop all', icon: LayoutGrid, count: countInCategory(null) },
    ...CATEGORIES.map((category) => ({
      id: category,
      label: category,
      icon: COLLECTION_ICON[category],
      count: countInCategory(category)
    }))
  ];

  const tierOptions: FilterOption<Tier | 'any'>[] = [
    { id: 'any', label: 'Any', count: countInTier(null) },
    ...TIERS.map((t) => ({ id: t.id, label: t.label, count: countInTier(t.id) }))
  ];

  /* Families that would leave nothing are dropped rather than shown at zero.
     Category and Kind can afford a "0" — three or six rows, and the zero is
     itself informative. Seven flavour rows under the Breads counter would be
     seven dead ends. The current answer always survives the cut, or picking one
     would make the row you picked vanish from under its own tick. */
  const flavourOptions: FilterOption<Flavour | 'any'>[] = [
    { id: 'any', label: 'Any flavour', count: countInFlavour(null) },
    ...FLAVOURS.map((f) => ({ id: f.id, label: f.label, count: countInFlavour(f.id) })).filter(
      (o) => o.count > 0 || o.id === flavour
    )
  ];

  /* Sort is deliberately not counted: there is no unsorted grid, so a badge
     that always read at least 1 would say nothing. */
  const activeFilters = (active ? 1 : 0) + (tier ? 1 : 0) + (flavour ? 1 : 0);

  /* Grouped only while the grid is showing everything.
     A picked category is already one group and the banner above it says which,
     so a heading there would repeat the page title. A search is a relevance
     list that happens to span counters — cutting it into five labelled runs
     would bury the best match under a subheading. */
  const grouped = !active && !query;

  /* Filtering the grid re-titles the row above it: picking Cookies makes the
     heading "Cookies", and the counter dividers inside the grid then have
     nothing left to divide — one category is one run. */

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

      {/* The counters, as cards. Browsing, not filtering — see CollectionRail
          for why that distinction earns it a place on the page when the filters
          themselves are behind a button. */}
      <CollectionRail active={active} onPick={setActive} />

      {/* What the pin watches. One pixel tall with a matching negative margin,
          so it occupies the line the grid starts on and no space at all — a
          genuinely zero-height target never changes intersection state, so the
          observer below would fire once on attach and never again. */}
      <div ref={gridTop} aria-hidden="true" style={{ height: 1, marginBottom: -1 }} />

      {/* The grid's own heading, and the way to narrow it, on one line with a
          rule under them. This is where the filter lives at rest — the pinned
          button is the same control following the visitor once this row has
          scrolled away, which is why they never appear together. */}
      <div className="shop-head">
        <h2 className="shop-head__title">{copy.title}</h2>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="shop-head__filter"
          aria-label="Filter and sort"
        >
          <SlidersHorizontal size={17} strokeWidth={2.5} aria-hidden="true" />
          Filter
          {activeFilters > 0 && <span className="filter-pin__badge">{activeFilters}</span>}
        </button>
      </div>

      {/* Never while a product page is open. The cabinet covers the pin on its
          own (z 165 against 140), but the box builder deliberately sits UNDER
          the navbar at z 40 so the header stays usable — which left the pin
          floating over it, offering to filter a grid nobody can see. */}
      <FilterButton
        active={activeFilters}
        shown={pinShown && !openPanel}
        top={chromeBottom}
        onClick={() => setFiltersOpen(true)}
      />

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sorts={SORTS}
        sort={sort}
        onSort={setSort}
        categories={categoryOptions}
        category={active ?? 'all'}
        onCategory={(next) => setActive(next === 'all' ? null : next)}
        tiers={tierOptions}
        tier={tier ?? 'any'}
        onTier={(next) => setTier(next === 'any' ? null : next)}
        flavours={flavourOptions}
        flavour={flavour ?? 'any'}
        onFlavour={(next) => setFlavour(next === 'any' ? null : next)}
        showing={shown.length}
        canClear={activeFilters > 0 || sort !== 'featured'}
        onClear={() => {
          setActive(null);
          setTier(null);
          setFlavour(null);
          setSort('featured');
        }}
      />

      {/* The search, and the way out of it. This is all that is left of the
          count line: "60 items" said nothing, but a page silently showing six
          products because a query is still in the header has to say why, and
          has to offer a way back. */}
      {query && (
        <p className="shop-query">
          Showing {shown.length} of {SHOP_PRODUCTS.length} for{' '}
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
            shop all
          </button>
          .
        </p>
      )}

      {/* A combination that matches nothing has to say so and offer the way
          back, exactly as an empty search does. The filters could not produce
          this before — the tier only ever applied to Donuts, where both halves
          are populated — but Cookies and Special is a real thing to pick now,
          and it is empty. */}
      {!query && shown.length === 0 && (
        <p className="shop-query shop-query--empty">
          No {tier ? `${TIERS.find((t) => t.id === tier)!.label.toLowerCase()} ` : ''}
          {flavour ? `${FLAVOURS.find((f) => f.id === flavour)!.label.toLowerCase()} ` : ''}items
          on {active ? `the ${active.toLowerCase()} counter` : 'any counter'}.{' '}
          <button
            type="button"
            onClick={() => {
              setActive(null);
              setTier(null);
              setFlavour(null);
            }}
            className="shop-query__clear"
          >
            shop all
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
                {/* The name, and nothing else. The rule that used to run out
                    from it drew a second horizontal line every few rows on a
                    page whose only real structure is the grid, and the name is
                    already the largest thing on its row. */}
                <span className="shop-divider__name">{tile.category}</span>
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
            /* The two build-your-own boxes get the homepage's proposition card
               here too — same component, same colours, same action. They are
               the same offer on both pages, and a box that reads as an idea on
               the homepage and as a product tile in the catalogue is two
               different things wearing one name. */
            BOX_BUILDER_IDS.has(tile.product.id) ? (
              <motion.div key={tile.product.id} layout {...slide(i)} className="box-card-cell">
                <BoxCard product={tile.product} />
              </motion.div>
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
                    background: boxQty[tile.product.id] ? C.navy : C.canvas,
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
                      /* One scale for every product. The heart and the Star of
                         David used to be shrunk to 0.82 here and nowhere else,
                         so the same two donuts were a different size in this
                         grid than on the homepage, the panel, the bag line and
                         the search results — which reads as the products being
                         smaller rather than as the tiles being different. */
                      transform: 'scale(1.18)'
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
                    /* Up a tier from 14/400. Karla at 800 made every name shout
                       and left the grid with no hierarchy in it, but 14 at
                       Regular put the product's own name below its price in
                       weight — the one thing on a tile that has to be read
                       first was the quietest thing on it. */
                    fontWeight: 700,
                    fontSize: 16,
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
                <span style={{ fontFamily: F.text, fontWeight: 500, fontSize: 14, color: C.price }}>{tile.product.price}</span>
              </button>
            </motion.article>
            )
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
