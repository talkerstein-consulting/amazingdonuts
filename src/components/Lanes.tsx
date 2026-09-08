import type { CSSProperties } from 'react';
import { BrandButton } from './brand';
import { SHOP_HREF } from '../lib/shop-href';
import { PICKUP_HREF } from '../lib/routes';
import { writeFulfillmentPreference, type FulfillmentPreference } from '../lib/fulfillment';
import { clearPickup } from '../lib/pickup';

/* The two ways to buy, not the product tiers. The lanes used to be
   Classic / Special / Donut lab, which split the catalogue three ways and then
   sent two of the cards to the same filtered grid — the section repeated what
   "Everyone has a favourite" does directly below it. These answer the question
   that grid cannot: how do I actually get them.

   Small cards, and the donut is the only picture on them. There were drawn
   lucide icons above the titles as well; they are gone, because a card with an
   icon *and* a photograph is two illustrations of the same three words, and
   the icon was the one carrying no information — a shopping bag does not tell
   anyone what delivery is.

   The images come straight from the product catalogue under
   `public/products/donuts/`, so these are the real cut-outs the shop sells
   rather than the stock-looking `public/img` boxes that stood in before. Each
   lane names its own donuts, and they rise out of the top of the card on hover
   — see `.lane-card__peek`. */
export const LANES = [
  {
    bg: 'var(--orange)',
    text: 'var(--navy)',
    title: 'Delivery',
    fulfillment: 'delivery' as FulfillmentPreference,
    images: [
      '/products/donuts/zap-donut-pink-blue-white-sprinkles.png',
      '/products/donuts/barbie-donut-pink-white-sprinkles.png',
      '/products/donuts/rainbow-donut-sprinkles.png'
    ],
    href: SHOP_HREF,
    border: 'var(--navy)'
  },
  {
    bg: 'var(--pink)',
    text: 'var(--navy)',
    title: 'Pickup',
    fulfillment: 'pickup' as FulfillmentPreference,
    images: [
      '/products/donuts/hava-nagilla-donut-blue-white-sprinkles.png',
      '/products/donuts/star-of-david-donut-special-order.png',
      '/products/donuts/candy-donut-round-sprinkles.png'
    ],
    /* The only card that does not go straight to the catalogue: pick-up needs
       a day and a window first, and the gate hands the visitor on to the shop
       once it has them. */
    href: PICKUP_HREF,
    border: 'var(--navy)'
  }
];

/* How the donuts fan out of the top of a card on hover.
   
   Hand-placed rather than computed. Evenly spaced, same size, same angle, they
   read as a row of icons; a handful of donuts tossed onto the card is three
   different sizes, three different angles and gaps that do not match. They
   overlap heavily on purpose — `x` is each donut's centre as a percentage of
   the card, and the donuts are wider than the gaps between those centres.

   `z` orders them against each other only — the wrapper is what puts the whole
   group behind the card's colour — so the biggest one takes the top value and
   sits in front of its neighbours.

   Three slots, and every lane fills all three. There was a two-donut table
   beside this one for Bulk; Bulk has three now, and nothing used it. */
const FAN_3 = [
  { x: 24, scale: 0.92, rot: -19, lift: 4, z: 1 },
  { x: 47, scale: 1.16, rot: 3, lift: 26, z: 3 },
  { x: 73, scale: 0.84, rot: 16, lift: 0, z: 2 }
];

/* The label names the lane's own action, because the two lanes do different
   things: Delivery goes to the catalogue, Pickup goes to a gate that wants a
   day and a window first. Both used to read "Order now", which gave two
   controls with different destinations the same accessible name — a screen
   reader heard "Order now, Order now" and a scanning eye had to fall back on
   the heading above each to tell them apart. */
const CTA: Record<string, string> = {
  Delivery: 'Order delivery',
  Pickup: 'Book a pickup'
};

export function LaneCard({ lane }: { lane: (typeof LANES)[number] }) {
  const rememberFulfillment = () => {
    if (lane.fulfillment) {
      writeFulfillmentPreference(lane.fulfillment);
      if (lane.fulfillment === 'delivery') clearPickup();
    }
  };
  return (
    <article className="lane-card" style={{ background: lane.bg, color: lane.text }}>
      {/* The lane's donuts, parked behind the card and hidden by it, rising
          out of its top edge on hover — or on keyboard focus reaching the
          link, via :focus-within. The wrapper is what keeps them hidden at
          rest: see `.lane-card__peeks`. `aria-hidden`, because they are
          decoration that only exists on hover; the card already names
          itself. */}
      <span className="lane-card__peeks" aria-hidden="true">
      {lane.images.map((src, i) => {
        const fan = FAN_3[i];

        return (
          <img
            key={src}
            className="lane-card__peek"
            src={src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            style={
              {
                left: `${fan.x}%`,
                /* Orders them against each other. The whole group is put
                   behind the card by the wrapper, not by these. */
                zIndex: fan.z,
                '--peek-scale': fan.scale,
                '--peek-rot': `${fan.rot}deg`,
                '--peek-lift': `${fan.lift}px`,
                /* Staggered, so they come up as a group and not a wall. */
                transitionDelay: `${i * 55}ms`
              } as CSSProperties
            }
          />
        );
      })}
      </span>

      {/* On phones there is no button, so this is the card's only control: the
          `.lane-card__title a::after` rule stretches it over the whole card,
          which is both a bigger tap target than a 100px button and the reason
          the button can go. */}
      <h2 className="lane-card__title" style={{ color: lane.text }}>
        <a href={lane.href} onClick={rememberFulfillment} style={{ color: 'inherit', textDecoration: 'none' }}>
          {lane.title}
        </a>
      </h2>

      <BrandButton
        href={lane.href}
        variant="outline"
        block
        className="lane-card__cta"
        onClick={rememberFulfillment}
        /* The knob stays Harbour per the spec; only the ring and label take the
           lane's contrast colour, since navy on Signal blue would not clear AA. */
        style={{ boxShadow: `inset 0 0 0 2px ${lane.border}`, color: lane.border }}
      >
        {CTA[lane.title] ?? 'Order now'}
      </BrandButton>
    </article>
  );
}
