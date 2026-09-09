import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES, SHOP_PRODUCTS, type Category, type Product } from '../data/products';
import { tagFor } from '../data/product-tags';

/**
 * The categories, as a row of tabs under the banner.
 *
 * Named "Categories" here and in the filter drawer, and nowhere "Collections":
 * the row, the drawer's group and the URL parameter are one piece of state, and
 * it had two names on screen depending on which control you were looking at.
 * The class names still read `collections` — renaming those is churn in three
 * files for no reader's benefit.
 *
 * This is browsing, not filtering, and the difference is why it can live on the
 * page while the filter drawer holds everything else. A filter answers "narrow
 * what I am already looking at"; these answer "what is there" — which is a
 * question a first-time visitor has before they have anything to narrow, and
 * the one the old chip row was too small to answer. A chip is five words in a
 * pill; these are one of the category's own products, its name and how much of
 * it there is.
 *
 * Picking a tab sets the category, exactly as the drawer's Categories group
 * does — the two are the same state, so they always agree.
 *
 * The face of each card is one of the counter's own products, cut out, sitting
 * directly on a flat brand colour. It was the category banner photograph — the
 * same 16:9 scene the page's own banner uses — and at 200px wide six crops of
 * six busy counter shots are six brown rectangles: they are photographs
 * composed to be a metre wide behind a card, not thumbnails. A single cut-out
 * on a solid ground is legible at any size, and the colour does the work of
 * telling the cards apart that the photographs were failing to do.
 *
 * Rectangles laid out sideways: the donut on the left, the name and the count
 * beside it. All six are Canvas, and the one that is showing goes Harbour.
 *
 * One colour for all of them, and one for the selection. Six different brand
 * colours told the tabs apart but said nothing — colour is the strongest
 * signal on the row and it was spent on decoration, which left the actual
 * state, "this is the category you are looking at", competing with five other
 * loud cards for attention. White tabs make the dark one unmissable, and
 * Harbour is the same ink every other selected control on this page inverts
 * to — the grid's old chips, the drawer's rows, the filter pin.
 *
 * They were tall squircle cards built like product tiles — picture on top,
 * name underneath. Same silhouette as the sixty things in the grid below, at
 * roughly the same size, which made the row read as the first row of products
 * rather than as the way into them; and it cost most of a screen before a
 * single donut was in view. A tab is a different object from a product on
 * purpose.
 */



/**
 * The product that stands for a counter.
 *
 * Whatever the bakery already tags there — Best Seller first, then Popular —
 * and the first of the run otherwise. Derived rather than a hand-written list
 * of ids, because `products.ts` is generated from the scrape and a hardcoded id
 * would silently become a broken image the next time it is regenerated.
 *
 * `taken` is what keeps Shop all off the donut Donuts is already showing. Shop
 * all draws from the whole catalogue and so lands on the same top-ranked item
 * as whichever counter that item belongs to — and the two cards are neighbours,
 * so the row opened on the same photograph twice.
 */
const faceFor = (category: Category | null, taken: Set<string>): Product => {
  const scope = category ? SHOP_PRODUCTS.filter((p) => p.category === category) : SHOP_PRODUCTS;
  const rank = (p: Product) => {
    const tag = tagFor(p.id);
    return tag === 'seller' ? 0 : tag === 'popular' ? 1 : 2;
  };
  const ordered = [...scope].sort((a, b) => rank(a) - rank(b));
  // Falls back to the counter's own best if every candidate is spoken for,
  // which a one-product counter would do.
  return ordered.find((p) => !taken.has(p.id)) ?? ordered[0] ?? SHOP_PRODUCTS[0];
};

export default function CollectionRail({
  active,
  onPick,
  compact = false,
  showAll = true
}: {
  active: Category | null;
  onPick: (next: Category | null) => void;
  /** The sticky homepage strip: one row, no heading, arrows on the edges. */
  compact?: boolean;
  /**
   * Whether to lead with the "Shop all" tab.
   *
   * On the catalogue it is the way back to the unfiltered grid and has to be
   * there — the rail is the only control that clears the category. On the
   * homepage it is not a category at all: nothing there is filtered, the tabs
   * are jumps down the page, and "Shop all" was the one that left it. A tab
   * that navigates away sitting first in a row of tabs that scroll is two
   * different promises in one control, and the header already carries the
   * link.
   */
  showAll?: boolean;
}) {
  const rail = useRef<HTMLDivElement | null>(null);
  /* Which arrows to draw. A rail that fits its content needs neither, and an
     arrow pointing at nothing is worse than no arrow. */
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: el.scrollLeft > 4, end: el.scrollLeft < max - 4 });
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    /* Also on resize: the rail fits at 1400px and does not at 900, so whether
       the arrows belong is a question of width, not only of scroll position. */
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, []);

  /* A card and a bit, so the next one is always partly in view after a nudge —
     a full-width page would leave the rail looking like it had not moved. */
  const nudge = (direction: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const countFor = (category: Category) => SHOP_PRODUCTS.filter((p) => p.category === category).length;

  /* Counters first, then Shop all, so Shop all is the one that has to work
     around the others rather than claiming a counter's own best seller and
     leaving that counter with its second choice. The row is then put back in
     display order. */
  const taken = new Set<string>();
  const counters = CATEGORIES.map((category) => {
    const face = faceFor(category, taken);
    taken.add(face.id);
    return {
      id: category as Category | null,
      label: category,
      count: countFor(category),
      face
    };
  });

  const cards = showAll
    ? [{ id: null, label: 'Shop all', count: SHOP_PRODUCTS.length, face: faceFor(null, taken) }, ...counters]
    : counters;

  const arrows = (
    <div className="collections__arrows">
      <button
        type="button"
        onClick={() => nudge(-1)}
        disabled={!edges.start}
        aria-label="Previous categories"
      >
        <ChevronLeft size={18} strokeWidth={2.6} />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        disabled={!edges.end}
        aria-label="Next categories"
      >
        <ChevronRight size={18} strokeWidth={2.6} />
      </button>
    </div>
  );

  return (
    <section
      className={`collections${compact ? ' collections--compact' : ''}`}
      aria-label="Categories"
    >
      {/* The compact rail has no heading and no head row at all: it is a strip
          that sticks under the navbar while the page scrolls past, and a
          section title repeated down the whole page is a title that has
          stopped titling anything. The arrows move onto the rail's own edges
          instead of sitting above it. */}
      {!compact && (
      <div className="collections__head">
        <h2 className="collections__title">Categories</h2>
        {/* Desktop affordance only — a touch rail is swiped, and two buttons
            beside it are two things to mis-tap. Hidden by CSS, not by a width
            check here, so there is no breakpoint kept in two places. */}
        {arrows}
      </div>
      )}

      {/* The fades are on the wrapper, not the scrollport: a scrolling element
          cannot paint anything that stays still over its own content. Each one
          is only drawn when there is something past that edge — a permanent
          gradient on a rail that fits reads as a rendering fault. */}
      <div className={`collections__scroller${edges.start ? ' has-start' : ''}${edges.end ? ' has-end' : ''}`}>
      {/* Over the rail rather than above it, so the strip is one row tall. */}
      {compact && arrows}
      <div className="collections__rail" ref={rail}>
        {cards.map((card) => {
          const on = active === card.id;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onPick(card.id)}
              aria-pressed={on}
              className={`collection-card${on ? ' is-on' : ''}`}
            >
              <span className="collection-card__bed">
                <img src={card.face.img} alt="" loading="lazy" />
              </span>
              <span className="collection-card__text">
                <span className="collection-card__name">{card.label}</span>
                <span className="collection-card__count">{card.count}</span>
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </section>
  );
}
