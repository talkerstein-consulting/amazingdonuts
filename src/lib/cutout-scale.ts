import { useEffect, useState } from 'react';

/**
 * How much of its own file each product cut-out actually fills, so several of
 * them can be drawn the same size.
 *
 * The catalogue's PNGs are not framed consistently. Measured across the donut
 * folder, the opaque part of a file runs from about 51% of its width to about
 * 64% — a round donut sits in roughly half its canvas, a cinnamon twist cluster
 * in nearly two thirds. Drop them into equal boxes with `object-fit: contain`
 * and they come out visibly different sizes, which is fine in a grid where each
 * tile is its own thing and wrong in a donut box, where six of them are
 * supposed to be six of the same object.
 *
 * So: measure the opaque bounding box once per image, and hand back the factor
 * that brings it to a common width. A donut filling 52% of its file scales by
 * 1.0; the twist filling 64% scales by 0.81 and stops looking oversized.
 *
 * Measured rather than tabulated because `products.ts` is generated from the
 * scrape — a hand-written table of per-file ratios would be stale the next time
 * the catalogue is regenerated, and stale in a way nobody would notice.
 *
 * Cheap: one 64x64 canvas read per URL, cached in a module-level map for the
 * life of the page, shared by every component that asks. The box builder asks
 * for at most twelve.
 */

/** The width every cut-out is normalised to, as a fraction of its own file. */
const TARGET = 0.52;

/** Small enough to be free, big enough to find the edges of a soft cut-out. */
const SAMPLE = 64;

/** Anything this faint is the artwork's own antialiasing, not the donut. */
const ALPHA_FLOOR = 12;

const cache = new Map<string, number>();
const pending = new Map<string, Promise<number>>();

async function measure(src: string): Promise<number> {
  const img = new Image();
  img.src = src;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 1;
  ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

  let left = SAMPLE;
  let right = -1;
  for (let y = 0; y < SAMPLE; y += 1) {
    for (let x = 0; x < SAMPLE; x += 1) {
      if (data[(y * SAMPLE + x) * 4 + 3] > ALPHA_FLOOR) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  // A fully transparent file would divide by zero; leave it alone.
  if (right < left) return 1;
  const ratio = (right - left + 1) / SAMPLE;
  return TARGET / ratio;
}

/**
 * The scale factor for one cut-out. `1` until it has been measured, so nothing
 * waits on a canvas read to paint — a donut lands at its natural size and
 * settles to the common one, which the slot's own transition covers.
 */
export function useCutoutScale(src: string | undefined) {
  const [scale, setScale] = useState(() => (src && cache.get(src)) || 1);

  useEffect(() => {
    if (!src) return;
    const known = cache.get(src);
    if (known !== undefined) {
      setScale(known);
      return;
    }

    let alive = true;
    /* One request per URL even when six slots ask at once — the second caller
       gets the first one's promise. */
    let job = pending.get(src);
    if (!job) {
      job = measure(src)
        .catch(() => 1)
        .then((value) => {
          cache.set(src, value);
          pending.delete(src);
          return value;
        });
      pending.set(src, job);
    }
    void job.then((value) => {
      if (alive) setScale(value);
    });

    return () => {
      alive = false;
    };
  }, [src]);

  return scale;
}
