import { useEffect, useState } from 'react';

/**
 * How many columns `.shop-grid` is currently showing.
 *
 * These two numbers mirror the media queries on `.shop-grid` in `shop.css` —
 * 2 up to 700, 3 up to 1000, 4 beyond — and they have to stay in step with it.
 * The catalogue needs the count in JS because the promo banner has to be
 * inserted after exactly two full rows of products, and "two rows" is a
 * different number of items at every width.
 *
 * Reading the real computed column count off the grid would avoid the
 * duplication, but it needs a ref and a ResizeObserver to answer a question
 * these two breakpoints already answer.
 */
export function useGridColumns() {
  const read = () => {
    if (typeof window === 'undefined') return 4;
    if (window.innerWidth >= 1000) return 4;
    if (window.innerWidth >= 700) return 3;
    return 2;
  };

  const [columns, setColumns] = useState(read);

  useEffect(() => {
    const onResize = () => setColumns(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return columns;
}
