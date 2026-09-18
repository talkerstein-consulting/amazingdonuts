import type { SyntheticEvent } from 'react';
import { PRODUCTS } from '../data/products';

export function fallbackProductImage(event: SyntheticEvent<HTMLImageElement>, productId: string) {
  const fallback = PRODUCTS.find((product) => product.id === productId)?.img;
  const image = event.currentTarget;
  if (fallback && image.src !== new URL(fallback, document.baseURI).href) image.src = fallback;
}
