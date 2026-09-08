/**
 * The donut that flies to the box.
 *
 * Adding something used to be silent above the fold: the tile's knob turned
 * into a stepper and the header's count went up by one, and on a wide window
 * those two things are 900px apart — so the number people are meant to notice
 * changed in the corner of the screen they were not looking at. This draws the
 * line between the two: the product itself arcs up to the bag, throwing
 * sprinkles as it goes, and the bag takes the hit at the end.
 *
 * Plain DOM and the Web Animations API rather than a React overlay. It is
 * called from four different trees (the homepage grid, Shop all, the product
 * panel and its bundle strip), it has to outlive the element that started it —
 * the knob it flew from is a stepper by the time it lands — and it never reads
 * or writes any state. A component would have to be mounted in all four places
 * and told about every add; a function is called where the add happens.
 *
 * Cheap by construction: transform and opacity only, one image and eight small
 * divs, all removed on finish.
 */

/** The palette the burst draws from — the same five the brand button uses. */
const SPRINKLES = ['#f5a3c7', '#f26b21', '#2f7fc1', '#fbf7ef', '#0e3e69'];

const SPRINKLE_COUNT = 8;
const FLIGHT_MS = 700;

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where the flight lands. Tagged in `Header`; absent on pages with no navbar. */
const cartTarget = () => document.querySelector<HTMLElement>('[data-cart-target]');

/**
 * A quadratic bezier, sampled.
 *
 * WAAPI interpolates straight lines between keyframes, so an arc has to be
 * handed to it as points along one. The control point sits above the midpoint
 * by a third of the horizontal distance, which is what makes the donut lob
 * towards the bag rather than slide at it — and it is proportional, so a short
 * hop from a nearby tile arcs less than one from the bottom of the page.
 */
function arc(dx: number, dy: number, steps = 12) {
  const cx = dx / 2;
  const cy = dy / 2 - Math.max(90, Math.abs(dx) / 3);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const inv = 1 - t;
    return {
      x: 2 * inv * t * cx + t * t * dx,
      y: 2 * inv * t * cy + t * t * dy
    };
  });
}

/** The bag's own reaction, so the flight ends on something rather than fading. */
function bumpCart(target: HTMLElement, big = false) {
  target.animate(
    big
      ? /* The Donut Lab's finale. Bigger and slower than an ordinary add,
           because it is the end of a five-step build rather than a tap on a
           grid tile — and because the lab's own stage is where the eye is, so
           the bag has to be worth looking up for. */
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.85) rotate(-8deg)', offset: 0.28 },
          { transform: 'scale(0.86) rotate(5deg)', offset: 0.52 },
          { transform: 'scale(1.3) rotate(-2deg)', offset: 0.74 },
          { transform: 'scale(1)' }
        ]
      : [
          { transform: 'scale(1)' },
          { transform: 'scale(1.28)', offset: 0.35 },
          { transform: 'scale(0.94)', offset: 0.62 },
          { transform: 'scale(1)' }
        ],
    { duration: big ? 820 : 420, easing: 'cubic-bezier(.22,1,.36,1)' }
  );
}

/**
 * The bag reacting on its own, with nothing flying into it.
 *
 * For the Donut Lab, where the claw sequence is the animation and a second
 * donut arcing across the screen on top of it would be two things at once.
 */
export function pulseCart() {
  const target = cartTarget();
  if (!target) return;
  bumpCart(target, true);
  /* And sprinkles off the bag itself. The claw sequence ends with the donut
     already gone into the carton, so there is nothing arriving for the bag to
     react to — the burst is what makes the pulse read as an impact rather than
     as the icon twitching on its own. Fired from the bag's own centre, not
     from a donut's flight path. */
  if (!reduced()) {
    const box = target.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 2, 14);
  }
}

function burst(x: number, y: number, count = SPRINKLE_COUNT) {
  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement('span');
    // Even spokes with a little scatter, so the ring is not a mechanical star.
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const travel = 34 + Math.random() * 38;

    Object.assign(bit.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: '260',
      width: `${6 + Math.random() * 4}px`,
      height: '3px',
      borderRadius: '99px',
      background: SPRINKLES[i % SPRINKLES.length],
      pointerEvents: 'none'
    });
    document.body.appendChild(bit);

    bit
      .animate(
        [
          { transform: `translate(-50%,-50%) rotate(${(angle * 180) / Math.PI}deg) scale(1)`, opacity: 1 },
          {
            transform: `translate(calc(-50% + ${Math.cos(angle) * travel}px), calc(-50% + ${
              Math.sin(angle) * travel
            }px)) rotate(${(angle * 180) / Math.PI + 140}deg) scale(0.4)`,
            opacity: 0
          }
        ],
        { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(.22,1,.36,1)' }
      )
      .finished.catch(() => {})
      .finally(() => bit.remove());
  }
}

/**
 * Fly `src` from `origin` to the cart.
 *
 * `origin` is the element that was pressed, or the photo it sits on — anything
 * with a box on screen. Its rect is measured once, up front, because the knob
 * it came from is replaced by a stepper on the same tick.
 *
 * `delay` staggers a flight against its siblings — see `flyManyToCart`. The
 * rect is still read now rather than at take-off: the button that started a
 * three-donut flight may well have changed by the time the third leaves.
 */
export function flyToCart(origin: Element | null, src: string, delay = 0) {
  const target = cartTarget();
  if (!target || !origin) return;

  const from = origin.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  // Nothing to watch if the press landed on the bag itself.
  if (!from.width || !to.width) return;

  if (reduced()) {
    bumpCart(target);
    return;
  }

  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;
  const dx = to.left + to.width / 2 - startX;
  const dy = to.top + to.height / 2 - startY;

  if (!delay) burst(startX, startY);
  else setTimeout(() => burst(startX, startY), delay);

  const donut = document.createElement('img');
  donut.src = src;
  donut.alt = '';
  donut.setAttribute('aria-hidden', 'true');
  Object.assign(donut.style, {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    zIndex: '255',
    width: '84px',
    height: '84px',
    objectFit: 'contain',
    pointerEvents: 'none',
    // Filters are cheap here and the donut is over the page, not on a card.
    filter: 'drop-shadow(0 10px 18px rgba(14,62,105,.35))'
  });
  document.body.appendChild(donut);

  const path = arc(dx, dy);
  donut
    .animate(
      path.map((point, i) => {
        const t = i / (path.length - 1);
        return {
          // Shrinks as it goes, so it reads as travelling away from the reader
          // and into the bag rather than sliding across the glass.
          transform: `translate(calc(-50% + ${point.x}px), calc(-50% + ${point.y}px)) rotate(${
            t * 220
          }deg) scale(${1 - t * 0.72})`,
          opacity: t > 0.86 ? 0 : 1
        };
      }),
      /* `fill: backwards` holds the first keyframe through the delay, so a
         queued donut waits at the origin rather than at its untransformed
         top-left corner. Three of them pile up on the button and peel off one
         at a time, which is the reading that matches what just happened. */
      { duration: FLIGHT_MS, delay, fill: 'backwards', easing: 'cubic-bezier(.4,0,.5,1)' }
    )
    .finished.catch(() => {})
    .finally(() => {
      donut.remove();
      bumpCart(target);
    });
}

/**
 * Several donuts, one after another, from the same place.
 *
 * For "Add all three": three separate calls fire three flights on the same
 * frame, along the same arc, and land as one donut with a thick outline. A
 * stagger makes it three things going into the bag, which is what happened.
 */
export function flyManyToCart(origin: Element | null, srcs: string[], gap = 140) {
  srcs.forEach((src, i) => flyToCart(origin, src, i * gap));
}
