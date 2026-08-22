import type { BadgeKey } from './Badge';

export type Donut = {
  id: string;
  name: string;
  price: string;
  img: string;
  blurb: string;
  badges: BadgeKey[];
};

/** The five products the Palette 03 specimen ships with. */
export const DONUTS: Donut[] = [
  {
    id: 'star',
    name: 'Star of David',
    price: '$4.75',
    img: '/img/star-of-david-donut-special-order-1.png',
    blurb: 'Hand-cut star, royal icing, blue sprinkles. Special order, 48 hours notice.',
    badges: ['special', 'nut']
  },
  {
    id: 'barbie',
    name: 'Barbie Sprinkle',
    price: '$3.95',
    img: '/img/barbie-donut-pink-white-sprinkles-1.png',
    blurb: 'Vanilla glaze buried under pink and white strands. The party favourite.',
    badges: ['party', 'nut']
  },
  {
    id: 'boston',
    name: 'Boston Creme',
    price: '$4.25',
    img: '/img/boston-creme-donut-custard-1.png',
    blurb: 'Custard filled, dark chocolate lid. Heavy, in the best way.',
    badges: ['classic', 'nut']
  },
  {
    id: 'caramel',
    name: 'Salted Caramel',
    price: '$4.50',
    img: '/img/caramel-donut-1.png',
    blurb: 'Caramel glaze, dark chocolate drizzle, flake salt finish.',
    badges: ['seller', 'nut']
  },
  {
    id: 'choc',
    name: 'Chocolate Glazed',
    price: '$3.50',
    img: '/img/chocolate-glazed-donut-1.png',
    blurb: 'One thick coat of dark chocolate. Nothing else needed.',
    badges: ['classic', 'dairy']
  }
];
