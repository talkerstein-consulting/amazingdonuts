import { BrandButton, C } from './brand';
import { useShop } from '../lib/shop';
import { HALF_DOZEN_BOX_ID, type Product } from '../data/products';

/**
 * The two build-your-own boxes, as proposition cards rather than product tiles.
 *
 * A product tile answers "what is this and what does it cost" — a squircle
 * photograph, a name, a price, a plus. That is the right card for a donut you
 * recognise and add. It is the wrong one for a box, because a box is not a
 * thing you add: it is an invitation to go and fill one, and the plus on it
 * promised an add that opens a builder instead.
 *
 * So these read like the petite and bulk cards further down the page — the
 * homepage's own language for "here is an idea, go and do it": a coloured
 * band, a line of copy, an outline button that names the action, and the
 * photograph bleeding off the end. Same double-width tile, different card.
 */
export default function BoxCard({ product }: { product: Product }) {
  const { openProduct } = useShop();
  const half = product.id === HALF_DOZEN_BOX_ID;

  return (
    <article
      className="box-card"
      /* Bubblegum for six, Signal for twelve — two propositions, told apart at
         a glance the way the petite and bulk cards are told apart from each
         other, rather than two identical bands with different numbers. */
      style={{ background: half ? C.pink : C.blue }}
    >
      <div className="box-card__copy">
        <h3 className="box-card__title" style={{ color: half ? C.navy : C.cream }}>
          {half ? 'The Sweet Six' : 'Take All Twelve'}
        </h3>
        {/* No body copy. The photograph of the box says what the box is, and
            the button says what you do with it — a paragraph between them was
            explaining a picture. */}
        {/* The price sits above the action rather than inside it. In the
            button it made a label too long for the card's copy column, which
            wrapped "Build a half dozen" onto three lines — and a price is a
            fact about the box, not part of what the button does. */}
        <span className="box-card__price" style={{ color: half ? C.navy : 'rgba(247,238,224,.9)' }}>
          {product.price}
        </span>
        <BrandButton
          variant="outline"
          className={`box-card__cta${half ? '' : ' box-card__cta--onDark'}`}
          onClick={() => openProduct(product.id)}
        >
          {half ? 'Build a half dozen' : 'Build a dozen'}
        </BrandButton>
      </div>

      <img src={product.img} alt={product.name} loading="lazy" className="box-card__photo" />
    </article>
  );
}

