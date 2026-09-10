// Generated from 'Amazing Donuts Products/catalog.csv' (scraped from amazingdonuts.com,
// 2026-08-20). Photos are the transparent cut-outs that ship alongside each listing.

export type Category = 'Donuts' | 'Muffins' | 'Cupcakes' | 'Cookies' | 'Breads';

export type Product = {
  id: string;
  name: string;
  price: string;
  category: Category;
  img: string;
  /**
   * Further views of the same product, in the order the thumbnail rail shows
   * them after `img`. The catalogue's photograph is a cut-out on transparency;
   * the entry here is the studio original it was cut from, on its white
   * ground. Products with no second view simply omit the field, and the rail
   * does not appear on their page.
   */
  secondary?: string[];
  url: string;
  boxFlavours?: string[];
  available?: boolean;
};

/**
 * Rows that exist so an order can be priced, and that nobody browses to.
 *
 * The Donut Lab's donut is a real catalogue line — the bag needs a product to
 * hang a price and a name on — but it is not a thing on a shelf: it does not
 * exist until somebody builds one, and its $2.00 is the bare shape before any
 * element is added. Left in the browsable list it appeared as a $2.00 donut
 * called "Donut lab donut" in the grid, in search, in "Goes well with", in the
 * category counts, and as a flavour you could drop into a box.
 *
 * `PRODUCTS` stays the complete set, because every id lookup goes through it —
 * cart lines, box contents, the lab's own add. `SHOP_PRODUCTS` is what any
 * surface a visitor browses should read instead.
 */
export const INTERNAL_PRODUCT_IDS = new Set(['donut-lab-donut']);

export const CATEGORIES: Category[] = ["Donuts", "Muffins", "Cupcakes", "Cookies", "Breads"];

/**
 * Hand-added, and the entries here the scrape does not produce.
 *
 * The bakery sells donuts by the piece and the CSV lists them that way; a box
 * you fill yourself is a thing the shop offers over the counter and has no row
 * of its own. They lead the list because they are the first things a visitor
 * browsing donuts should see, and `featured` order is catalogue order.
 *
 * Two of them, one per tray, rather than one product that asks which size. A
 * shopper scanning the grid is choosing what to buy, and "six" and "twelve" are
 * two different purchases at two different prices — one tile that turned out to
 * be either made the grid say less than it could, and hid half the offer behind
 * a click.
 *
 * If the catalogue is ever regenerated, these blocks have to be put back —
 * which is what this note is for. Their ids are referenced by `BOX_PRODUCTS` in
 * `lib/custom-order` and by `BoxBuilder`.
 */
export const HALF_DOZEN_BOX_ID = 'half-dozen-box';
export const DOZEN_BOX_ID = 'dozen-box';

/**
 * The two build-your-own boxes, which every grid draws at double width.
 *
 * They are not donuts you pick off a shelf — they are the way into the box
 * builder, and the run of $2.00 thumbnails behind them is what you fill them
 * with. At the same size as their own contents they read as two more items in
 * a list of sixty. A tile each spanning two columns puts the pair on one row
 * at the head of the Donuts run, which is the order they are listed in.
 */
export const BOX_BUILDER_IDS = new Set<string>([HALF_DOZEN_BOX_ID, DOZEN_BOX_ID]);

export const LAB_PRODUCT_ID = 'donut-lab-donut';

/**
 * Petite donuts, bulk only. The row the scrape produced — there is no longer a
 * second, hand-added one.
 *
 * The catalogue carried this product twice: `petite-donuts-75`, added by hand
 * when the homepage's petite card needed something to buy, and this one, which
 * the scrape had lifted from the live listing all along. Two rows, one product,
 * the same name on both — which meant two tiles in any grid that showed them,
 * two different photographs of the same donut, and an ambiguous match for
 * Square, which pairs an order line to the catalogue BY NAME. The scraped row
 * survives because it is the bakery's own: its photograph and its second view
 * came from the listing, and its id is the listing's slug.
 *
 * Priced as the pack it is actually sold as. The listing quotes $1.50 a donut
 * and refuses any order under 75, so $1.50 was never a price anyone could pay —
 * it made the tile, the bag and the homepage card all advertise a donut you
 * cannot buy one of, and left the real cost of the smallest possible order
 * ($112.50) to be discovered at the end. The line quantity now counts packs of
 * 75; `BULK_PACK_SIZES` is what says how many donuts are in one.
 * https://amazingdonuts.com/petite-size-donut-bulk-order-only/
 */
export const PETITE_PRODUCT_ID = 'petite-size-donut-bulk-order-only';

export const PRODUCTS: Product[] = [
  {
    id: LAB_PRODUCT_ID,
    name: 'Donut lab donut',
    price: '$2.00',
    category: 'Donuts',
    img: '/products/donuts/customizable-donut.png',
    url: ''
  },
  {
    id: HALF_DOZEN_BOX_ID,
    name: 'Build your own half dozen',
    price: '$12.00',
    category: 'Donuts',
    /* The real product photograph, not the tray line art. The SVG stays as the
       builder's interactive tray — its slots are what a chosen donut lands in —
       but the thing shown in the grid, the bag and the panel should be the box
       the bakery actually hands over.

       NEEDS OPTIMISING: shipped straight from the supplied 2720px PNG at ~7MB.
       There is no image toolchain in this project to resize or re-encode it, so
       it is here at full weight. It wants to be a ~1200px WebP before launch. */
    img: '/products/boxes/half-dozen-box.png',
    url: ''
  },
  {
    id: DOZEN_BOX_ID,
    name: 'Build your own dozen',
    // Offline fallback; the storefront refreshes this price from Square.
    price: '$24.00',
    category: 'Donuts',
    /* See the note on the half dozen: real photograph here, tray line art in
       the builder, and this file needs the same optimising (~8MB). */
    img: '/products/boxes/dozen-box.png',
    url: ''
  },
  {
    id: "twelve-custom-printed-donuts",
    name: "Twelve Custom Printed Donuts",
    price: "$45.00",
    category: "Donuts",
    img: "/products/donuts/twelve-custom-printed-donuts.png",
    secondary: ["/products/donuts/secondary/twelve-custom-printed-donuts.jpg"],
    url: "https://amazingdonuts.com/twelve-custom-printed-donuts/"
  },
  {
    id: "zap-donut-pink-blue-white-sprinkles",
    name: "Zap Donut - Pink, Blue & White Sprinkles",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/zap-donut-pink-blue-white-sprinkles.png",
    secondary: ["/products/donuts/secondary/zap-donut-pink-blue-white-sprinkles.jpg"],
    url: "https://amazingdonuts.com/zap-donut-pink-blue-white-sprinkles/"
  },
  {
    id: "barbie-donut-pink-white-sprinkles",
    name: "Barbie Donut - Pink & White Sprinkles",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/barbie-donut-pink-white-sprinkles.png",
    secondary: ["/products/donuts/secondary/barbie-donut-pink-white-sprinkles.jpg"],
    url: "https://amazingdonuts.com/pink-white-sprinkles-donut-barbie/"
  },
  {
    id: "rainbow-donut-sprinkles",
    name: "Rainbow Donut - Sprinkles",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/rainbow-donut-sprinkles.png",
    secondary: ["/products/donuts/secondary/rainbow-donut-sprinkles.jpg"],
    url: "https://amazingdonuts.com/rainbow-donut-sprinkles/"
  },
  {
    id: "hava-nagilla-donut-blue-white-sprinkles",
    name: "Hava Nagilla Donut - Blue & White Sprinkles",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/hava-nagilla-donut-blue-white-sprinkles.png",
    secondary: ["/products/donuts/secondary/hava-nagilla-donut-blue-white-sprinkles.jpg"],
    url: "https://amazingdonuts.com/hava-nagilla-donut-blue-white-sprinkles/"
  },
  {
    id: "chocolate-marble-donut",
    name: "Chocolate Marble Donut",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/chocolate-marble-donut.png",
    secondary: ["/products/donuts/secondary/chocolate-marble-donut.jpg"],
    url: "https://amazingdonuts.com/chocolate-marble-donut/"
  },
  {
    id: "chocolate-glazed-donut",
    name: "Chocolate Glazed Donut",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/chocolate-glazed-donut.png",
    secondary: ["/products/donuts/secondary/chocolate-glazed-donut.jpg"],
    url: "https://amazingdonuts.com/chocolate-glazed-donut/"
  },
  {
    id: "candy-donut-round-sprinkles",
    name: "Candy Donut - Round Sprinkles",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/candy-donut-round-sprinkles.png",
    secondary: ["/products/donuts/secondary/candy-donut-round-sprinkles.jpg"],
    url: "https://amazingdonuts.com/candy-donut-round-sprinkles/"
  },
  {
    id: "white-marble-donut",
    name: "White Marble Donut",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/white-marble-donut.png",
    secondary: ["/products/donuts/secondary/white-marble-donut.jpg"],
    url: "https://amazingdonuts.com/white-marble-donut/"
  },
  {
    id: "glazed-donut",
    name: "Glazed Donut",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/glazed-donut.png",
    secondary: ["/products/donuts/secondary/glazed-donut.jpg"],
    url: "https://amazingdonuts.com/glazed-donut/"
  },
  {
    id: "mini-boston-cream-6",
    name: "Mini Boston Cream (6)",
    price: "$12.00",
    category: "Donuts",
    img: "/products/donuts/mini-boston-cream-6.png",
    secondary: ["/products/donuts/secondary/mini-boston-cream-6.png"],
    url: "https://amazingdonuts.com/mini-boston-cream-6/"
  },
  {
    id: "cinnamon-twist",
    name: "Cinnamon twist",
    price: "$2.50",
    category: "Donuts",
    img: "/products/donuts/cinnamon-twist.png",
    secondary: ["/products/donuts/secondary/cinnamon-twist.png"],
    url: "https://amazingdonuts.com/cinnamon-twist/"
  },
  {
    id: "amazing-bites-dozen",
    name: "Amazing Bites (dozen)",
    price: "$12.00",
    category: "Donuts",
    img: "/products/donuts/amazing-bites-dozen.png",
    secondary: ["/products/donuts/secondary/amazing-bites-dozen.png"],
    url: "https://amazingdonuts.com/amazing-bites-dozen/"
  },
  {
    id: "letter-number-donut-cake",
    name: "Letter/ Number Donut Cake",
    price: "$75.00",
    category: "Donuts",
    img: "/products/donuts/letter-number-donut-cake.png",
    secondary: ["/products/donuts/secondary/letter-number-donut-cake.png"],
    url: "https://amazingdonuts.com/letter-number-donut-cake/"
  },
  {
    id: "donut-cake-14-inch",
    name: "Donut Cake (14 inch)",
    price: "$35.00",
    category: "Donuts",
    img: "/products/donuts/donut-cake-14-inch.png",
    secondary: ["/products/donuts/secondary/donut-cake-14-inch.png"],
    url: "https://amazingdonuts.com/donut-cake-14-inch/"
  },
  {
    id: "caramel-donut",
    name: "Caramel Donut",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/caramel-donut.png",
    secondary: ["/products/donuts/secondary/caramel-donut.jpg"],
    url: "https://amazingdonuts.com/caramel-donut/"
  },
  {
    id: "cookie-crumb-donut",
    name: "Cookie Crumb Donut",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/cookie-crumb-donut.png",
    secondary: ["/products/donuts/secondary/cookie-crumb-donut.jpg"],
    url: "https://amazingdonuts.com/cookie-crumb-donut/"
  },
  {
    id: "boston-creme-donut-custard",
    name: "Boston Creme Donut - Custard",
    price: "$2.75",
    category: "Donuts",
    img: "/products/donuts/boston-creme-donut-custard.png",
    secondary: ["/products/donuts/secondary/boston-creme-donut-custard.jpg"],
    url: "https://amazingdonuts.com/boston-creme-donut-custard/"
  },
  {
    id: "harry-potter-donut",
    name: "Harry Potter Donut",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/harry-potter-donut.png",
    secondary: ["/products/donuts/secondary/harry-potter-donut.jpg"],
    url: "https://amazingdonuts.com/harry-potter-donut/"
  },
  {
    id: "customizable-donut",
    name: "Customizable Donut",
    price: "$3.00",
    category: "Donuts",
    img: "/products/donuts/customizable-donut.png",
    secondary: ["/products/donuts/secondary/customizable-donut.png"],
    url: "https://amazingdonuts.com/customizable-donut/"
  },
  {
    id: "carnival-donut-pink-blue-yellow-sprinkles",
    name: "Carnival Donut - Pink, Blue & Yellow Sprinkles",
    price: "$2.00",
    category: "Donuts",
    img: "/products/donuts/carnival-donut-pink-blue-yellow-sprinkles.png",
    secondary: ["/products/donuts/secondary/carnival-donut-pink-blue-yellow-sprinkles.jpg"],
    url: "https://amazingdonuts.com/carnival-donut-pink-blue-yellow-sprinkles/"
  },
  {
    id: "jelly-filled-donut",
    name: "Jelly Filled Donut",
    price: "$2.75",
    category: "Donuts",
    img: "/products/donuts/jelly-filled-donut.png",
    secondary: ["/products/donuts/secondary/jelly-filled-donut.jpg"],
    url: "https://amazingdonuts.com/jelly-filled-donut/"
  },
  {
    id: "petite-size-donut-bulk-order-only",
    name: "Petite Size Donut (Bulk Order Only)",
    /* The bakery's own figure for the 75 pack. It is NOT 75 × the $1.50 the
       live listing quotes per donut, which would be $112.50 — the per-donut
       line under the price is derived from this one and so reads $1.83, not
       $1.50. Worth a check against the bakery before launch: one of the two
       numbers on that listing is out of date, and this file now follows the
       pack price rather than the per-donut one. */
    price: "$137.00",
    category: "Donuts",
    img: "/products/donuts/petite-size-donut-bulk-order-only.png",
    secondary: ["/products/donuts/secondary/petite-size-donut-bulk-order-only.png"],
    url: "https://amazingdonuts.com/petite-size-donut-bulk-order-only/"
  },
  {
    id: "heart-shape-donut",
    name: "Heart Shape Donut",
    price: "$3.00",
    category: "Donuts",
    img: "/products/donuts/heart-shape-donut.png",
    secondary: ["/products/donuts/secondary/heart-shape-donut.png"],
    url: "https://amazingdonuts.com/heart-shape-donut/"
  },
  {
    id: "star-of-david-donut-special-order",
    name: "Star of David Donut (special order)",
    price: "$3.00",
    category: "Donuts",
    img: "/products/donuts/star-of-david-donut-special-order.png",
    secondary: ["/products/donuts/secondary/star-of-david-donut-special-order.jpg"],
    url: "https://amazingdonuts.com/star-of-david-donut-special-order/"
  },
  {
    id: "gluten-free-muffin",
    name: "Gluten Free Muffin",
    price: "$4.50",
    category: "Muffins",
    img: "/products/muffins/gluten-free-muffin.png",
    secondary: ["/products/muffins/secondary/gluten-free-muffin.png"],
    url: "https://amazingdonuts.com/gluten-free-muffin/"
  },
  {
    id: "banana-muffin",
    name: "Banana Muffin",
    price: "$2.00",
    category: "Muffins",
    img: "/products/muffins/banana-muffin.png",
    secondary: ["/products/muffins/secondary/banana-muffin.jpg"],
    url: "https://amazingdonuts.com/banana-muffin/"
  },
  {
    id: "carrot-muffin",
    name: "Carrot Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/carrot-muffin.png",
    secondary: ["/products/muffins/secondary/carrot-muffin.jpg"],
    url: "https://amazingdonuts.com/carrot-muffin/"
  },
  {
    id: "blueberry-bran-muffin",
    name: "Blueberry Bran Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/blueberry-bran-muffin.png",
    secondary: ["/products/muffins/secondary/blueberry-bran-muffin.jpg"],
    url: "https://amazingdonuts.com/blueberry-bran-muffin/"
  },
  {
    id: "lemon-poppy-muffin",
    name: "Lemon Poppy Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/lemon-poppy-muffin.png",
    secondary: ["/products/muffins/secondary/lemon-poppy-muffin.jpg"],
    url: "https://amazingdonuts.com/lemon-poppy-muffin/"
  },
  {
    id: "apple-cinnamon-muffin",
    name: "Apple Cinnamon Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/apple-cinnamon-muffin.png",
    secondary: ["/products/muffins/secondary/apple-cinnamon-muffin.jpg"],
    url: "https://amazingdonuts.com/apple-cinnamon-muffin/"
  },
  {
    id: "cranberry-muffin",
    name: "Cranberry Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/cranberry-muffin.png",
    secondary: ["/products/muffins/secondary/cranberry-muffin.jpg"],
    url: "https://amazingdonuts.com/cranberry-muffin/"
  },
  {
    id: "double-chocolate-muffin",
    name: "Double Chocolate Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/double-chocolate-muffin.png",
    secondary: ["/products/muffins/secondary/double-chocolate-muffin.jpg"],
    url: "https://amazingdonuts.com/double-chocolate-muffin/"
  },
  {
    id: "cappuccino-muffin",
    name: "Cappuccino Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/cappuccino-muffin.png",
    secondary: ["/products/muffins/secondary/cappuccino-muffin.jpg"],
    url: "https://amazingdonuts.com/cappuccino-muffin/"
  },
  {
    id: "marble-muffin",
    name: "Marble Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/marble-muffin.png",
    secondary: ["/products/muffins/secondary/marble-muffin.jpg"],
    url: "https://amazingdonuts.com/marble-muffin/"
  },
  {
    id: "chocolate-chip-muffin",
    name: "Chocolate Chip Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/chocolate-chip-muffin.png",
    secondary: ["/products/muffins/secondary/chocolate-chip-muffin.jpg"],
    url: "https://amazingdonuts.com/chocolate-chip-muffin/"
  },
  {
    id: "blueberry-muffin",
    name: "Blueberry Muffin",
    price: "$2.75",
    category: "Muffins",
    img: "/products/muffins/blueberry-muffin.png",
    secondary: ["/products/muffins/secondary/blueberry-muffin.png"],
    url: "https://amazingdonuts.com/blueberry-muffin/"
  },
  {
    id: "mini-muffins",
    name: "Mini Muffins",
    price: "$12.00",
    category: "Muffins",
    img: "/products/muffins/mini-muffins.png",
    secondary: ["/products/muffins/secondary/mini-muffins.png"],
    url: "https://amazingdonuts.com/mini-muffins/"
  },
  {
    id: "twelve-custom-printed-cupcakes",
    name: "Twelve Custom Printed Cupcakes",
    price: "$45.00",
    category: "Cupcakes",
    img: "/products/cupcakes/twelve-custom-printed-cupcakes.png",
    secondary: ["/products/cupcakes/secondary/twelve-custom-printed-cupcakes.jpg"],
    url: "https://amazingdonuts.com/twelve-custom-printed-cupcakes/"
  },
  {
    id: "chocolate-cupcake",
    name: "Chocolate Cupcake",
    price: "$2.00",
    category: "Cupcakes",
    img: "/products/cupcakes/chocolate-cupcake.png",
    secondary: ["/products/cupcakes/secondary/chocolate-cupcake.jpg"],
    url: "https://amazingdonuts.com/chocolate-cupcake/"
  },
  {
    id: "vanilla-cupcake",
    name: "Vanilla Cupcake",
    price: "$2.00",
    category: "Cupcakes",
    img: "/products/cupcakes/vanilla-cupcake.png",
    secondary: ["/products/cupcakes/secondary/vanilla-cupcake.jpg"],
    url: "https://amazingdonuts.com/vanilla-cupcake/"
  },
  {
    id: "mini-vanilla-cupcake-dozen",
    name: "Mini Vanilla Cupcake (Dozen)",
    price: "$12.00",
    category: "Cupcakes",
    img: "/products/cupcakes/mini-vanilla-cupcake-dozen.png",
    secondary: ["/products/cupcakes/secondary/mini-vanilla-cupcake-dozen.png"],
    url: "https://amazingdonuts.com/mini-vanilla-cupcake-dozen/"
  },
  {
    id: "mini-chocolate-cupcake-dozen",
    name: "Mini Chocolate Cupcake (Dozen)",
    price: "$12.00",
    category: "Cupcakes",
    img: "/products/cupcakes/mini-chocolate-cupcake-dozen.png",
    secondary: ["/products/cupcakes/secondary/mini-chocolate-cupcake-dozen.png"],
    url: "https://amazingdonuts.com/mini-chocolate-cupcake-dozen/"
  },
  {
    id: "cupcakes-coloured-icing",
    name: "Cupcakes coloured icing",
    price: "$2.25",
    category: "Cupcakes",
    img: "/products/cupcakes/cupcakes-coloured-icing.png",
    secondary: ["/products/cupcakes/secondary/cupcakes-coloured-icing.jpg"],
    url: "https://amazingdonuts.com/cupcakes-coloured-icing/"
  },
  {
    id: "cupcakes-lettering",
    name: "Cupcakes lettering",
    price: "$3.00",
    category: "Cupcakes",
    img: "/products/cupcakes/cupcakes-lettering.png",
    secondary: ["/products/cupcakes/secondary/cupcakes-lettering.png"],
    url: "https://amazingdonuts.com/cupcakes-lettering/"
  },
  {
    id: "chocolate-sprinkle-cookie",
    name: "Chocolate Sprinkle Cookie",
    price: "$1.00",
    category: "Cookies",
    img: "/products/cookies/chocolate-sprinkle-cookie.png",
    secondary: ["/products/cookies/secondary/chocolate-sprinkle-cookie.jpg"],
    url: "https://amazingdonuts.com/chocolate-sprinkle-cookie/"
  },
  {
    id: "vanilla-sprinkle-cookie",
    name: "Vanilla Sprinkle Cookie",
    price: "$1.00",
    category: "Cookies",
    img: "/products/cookies/vanilla-sprinkle-cookie.png",
    secondary: ["/products/cookies/secondary/vanilla-sprinkle-cookie.jpg"],
    url: "https://amazingdonuts.com/vanilla-sprinkle-cookie/"
  },
  {
    id: "strawberry-cookie",
    name: "Strawberry Cookie",
    price: "$1.00",
    category: "Cookies",
    img: "/products/cookies/strawberry-cookie.png",
    secondary: ["/products/cookies/secondary/strawberry-cookie.jpg"],
    url: "https://amazingdonuts.com/strawberry-cookie/"
  },
  {
    id: "lemon-cookie",
    name: "Lemon Cookie",
    price: "$1.00",
    category: "Cookies",
    img: "/products/cookies/lemon-cookie.png",
    secondary: ["/products/cookies/secondary/lemon-cookie.jpg"],
    url: "https://amazingdonuts.com/lemon-cookie/"
  },
  {
    id: "snickerdoodle",
    name: "Snickerdoodle",
    price: "$1.00",
    category: "Cookies",
    img: "/products/cookies/snickerdoodle.png",
    secondary: ["/products/cookies/secondary/snickerdoodle.jpg"],
    url: "https://amazingdonuts.com/snickerdoodle/"
  },
  {
    id: "brownie-square",
    name: "Brownie Square",
    price: "$2.00",
    category: "Cookies",
    img: "/products/cookies/brownie-square.png",
    secondary: ["/products/cookies/secondary/brownie-square.jpg"],
    url: "https://amazingdonuts.com/brownie-square/"
  },
  {
    id: "chocolate-chip-blondie-square",
    name: "Chocolate Chip Blondie Square",
    price: "$2.00",
    category: "Cookies",
    img: "/products/cookies/chocolate-chip-blondie-square.png",
    secondary: ["/products/cookies/secondary/chocolate-chip-blondie-square.jpg"],
    url: "https://amazingdonuts.com/chocolate-chip-blondie-square/"
  },
  {
    id: "colorful-sprinkle-cookie",
    name: "Colorful Sprinkle Cookie",
    price: "$1.00",
    category: "Cookies",
    img: "/products/cookies/colorful-sprinkle-cookie.png",
    secondary: ["/products/cookies/secondary/colorful-sprinkle-cookie.jpg"],
    url: "https://amazingdonuts.com/colorful-sprinkle-cookie/"
  },
  {
    id: "white-powder-cookie",
    name: "White Powder Cookie",
    price: "$1.00",
    category: "Cookies",
    img: "/products/cookies/white-powder-cookie.png",
    secondary: ["/products/cookies/secondary/white-powder-cookie.jpg"],
    url: "https://amazingdonuts.com/white-powder-cookie/"
  },
  {
    id: "chocolate-chip-jumbo-cookie",
    name: "Chocolate Chip Jumbo Cookie",
    price: "$3.00",
    category: "Cookies",
    img: "/products/cookies/chocolate-chip-jumbo-cookie.png",
    secondary: ["/products/cookies/secondary/chocolate-chip-jumbo-cookie.jpg"],
    url: "https://amazingdonuts.com/chococlate-chip-jombo-cookie/"
  },
  {
    id: "challah-loaf-special-order",
    name: "Challah Loaf (special order)",
    price: "$9.00",
    category: "Breads",
    img: "/products/breads/challah-loaf-special-order.png",
    secondary: ["/products/breads/secondary/challah-loaf-special-order.jpg"],
    url: "https://amazingdonuts.com/challah-loaf-special-order/"
  },
  {
    id: "hot-dog-bun-special-order",
    name: "Hot Dog Bun (special order)",
    price: "$1.20",
    category: "Breads",
    img: "/products/breads/hot-dog-bun-special-order.webp",
    secondary: ["/products/breads/hot-dog-bun-special-order.jpg"],
    url: "https://amazingdonuts.com/hot-dog-special-order/"
  },
  {
    id: "round-challah-special-order",
    name: "Round Challah (special order)",
    price: "$9.00",
    category: "Breads",
    img: "/products/breads/round-challah-special-order.jpg",
    url: "https://amazingdonuts.com/round-challah-special-order/"
  },
  {
    id: "challah-six-braid-friday-only",
    name: "Challah - Six Braid (Friday Only)",
    price: "$9.00",
    category: "Breads",
    img: "/products/breads/challah-six-braid-friday-only.png",
    secondary: ["/products/breads/secondary/challah-six-braid-friday-only.jpg"],
    url: "https://amazingdonuts.com/challah-six-braid-friday-only/"
  },
  {
    id: "bulka-challah-special-order",
    name: "Bulka Challah (special order)",
    price: "$1.20",
    category: "Breads",
    img: "/products/breads/bulka-challah-special-order.png",
    secondary: ["/products/breads/secondary/bulka-challah-special-order.jpg"],
    url: "https://amazingdonuts.com/bulka-challah-special-order/"
  }
];

/**
 * The catalogue as a visitor sees it: everything except the internal rows.
 *
 * Derived rather than hand-maintained, so adding another internal product is
 * one entry in `INTERNAL_PRODUCT_IDS` and every grid, count and suggestion
 * follows.
 */
export const SHOP_PRODUCTS = PRODUCTS.filter((product) => !INTERNAL_PRODUCT_IDS.has(product.id));
