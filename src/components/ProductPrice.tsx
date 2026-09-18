import type { CSSProperties } from 'react';
import type { Product } from '../data/products';

export default function ProductPrice({ product, className = '', style }: { product: Product; className?: string; style?: CSSProperties }) {
  return (
    <span className={`product-price${product.originalPrice ? ' product-price--sale' : ''}${className ? ` ${className}` : ''}`} style={style}>
      {product.originalPrice && <del>{product.originalPrice}</del>}
      <span>{product.price}</span>
    </span>
  );
}
