import type { Product } from '../data/products';

export type SquareStorefrontProduct = {
  name: string;
  price: number;
  originalPrice?: number;
  category?: string;
  img?: string;
  secondary?: string[];
  available?: boolean;
};

/** Square owns whether a product exists, its category, price, and availability. */
export function mergeSquareCatalog(localProducts: Product[], squareProducts: SquareStorefrontProduct[], uncategorizedIds: ReadonlySet<string> = new Set()) {
  const live = new Map(squareProducts.map((product) => [product.name.trim().toLowerCase(), product]));

  return localProducts.flatMap((product) => {
    const match = live.get(product.name.trim().toLowerCase());
    const category = match?.category?.trim();
    if (!match || (!category && !uncategorizedIds.has(product.id))) return [];

    return [{
      ...product,
      price: `$${(match.price / 100).toFixed(2)}`,
      originalPrice: match.originalPrice && match.originalPrice > match.price
        ? `$${(match.originalPrice / 100).toFixed(2)}`
        : undefined,
      category: category || '',
      img: match.img || product.img,
      secondary: match.secondary?.length ? match.secondary : product.secondary,
      available: match.available !== false
    }];
  });
}

export function categoriesFromProducts(products: Product[]) {
  return [...new Set(products.map((product) => product.category))];
}
