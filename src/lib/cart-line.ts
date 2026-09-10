import type { Product } from '../data/products';
import type { Customization } from './custom-order';

export function lineKeyOf(line: { product: Product; customization?: Customization }) {
  const custom = line.customization;
  if (custom?.kind === 'glyph' && custom.glyph) return `${line.product.id}::${custom.glyph}`;
  if (custom?.kind === 'box') return `${line.product.id}::box::${JSON.stringify([...custom.donuts].sort())}`;
  return line.product.id;
}
