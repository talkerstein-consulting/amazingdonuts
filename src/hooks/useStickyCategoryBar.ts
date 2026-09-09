import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FULFILLMENT_EVENT } from '../lib/fulfillment';

export const CATEGORY_BAR_GAP = 16;
export const COMPACT_CATEGORY_BAR_HEIGHT = 72;

export function useStickyCategoryBar() {
  const sentinel = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [chromeHeight, setChromeHeight] = useState(64);
  const [stuck, setStuck] = useState(false);
  const [restHeight, setRestHeight] = useState(0);
  const stickyTop = chromeHeight + CATEGORY_BAR_GAP;

  useEffect(() => {
    let frame = 0;
    const observed = new Set<HTMLElement>();
    const measure = () => {
      const elements = ['header', '.pickup-banner'].map(
        (selector) => document.querySelector<HTMLElement>(selector)
      );
      setChromeHeight(elements.reduce((height, element) => height + (element?.offsetHeight ?? 0), 0));
      observed.forEach((element) => {
        if (!elements.includes(element)) {
          observer.unobserve(element);
          observed.delete(element);
        }
      });
      elements.forEach((element) => {
        if (element && !observed.has(element)) {
          observer.observe(element);
          observed.add(element);
        }
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    measure();
    window.addEventListener('resize', schedule);
    window.addEventListener(FULFILLMENT_EVENT, schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener(FULFILLMENT_EVENT, schedule);
    };
  }, []);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    let frame = 0;
    const measure = () => setStuck(element.getBoundingClientRect().top <= stickyTop);
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    // A large jump can skip the sentinel without changing its intersection state.
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [stickyTop]);

  // Preserve the expanded row's space while its sticky contents become compact.
  useEffect(() => {
    const element = inner.current;
    if (!element || stuck) return;
    const measure = () => {
      if (!element.parentElement?.classList.contains('is-stuck') &&
          !element.getAnimations({ subtree: true }).some((animation) => animation.playState === 'running')) {
        setRestHeight(element.getBoundingClientRect().height);
      }
    };
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(element);
    element.addEventListener('transitionend', measure);
    return () => {
      observer.disconnect();
      element.removeEventListener('transitionend', measure);
    };
  }, [stuck]);

  return {
    sentinel,
    inner,
    stuck,
    stickyTop,
    style: {
      '--rail-top': `${stickyTop}px`,
      '--rail-rest': restHeight ? `${Math.ceil(restHeight)}px` : 'auto'
    } as CSSProperties
  };
}
