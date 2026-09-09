import { Star } from 'lucide-react';
import GoogleG from './GoogleG';
import { RATING } from '../data/reviews';

/**
 * The Google score, stated and not linked.
 *
 * Deliberately inert. It sits directly under Delivery and Pick up, and a third
 * clickable thing in that group reads as a third way to buy — it would pull
 * presses off the two cards it is there to support, and send them off the page
 * rather than into the shop. It is evidence for the choice above it, not
 * another choice.
 *
 * `tone` is which ground it is sitting on. On Canvas it takes the ink; the
 * navy variant stays for the trust band's own use of it.
 */
export default function ReviewScore({ tone = 'ink', count = false }: { tone?: 'ink' | 'cream'; count?: boolean }) {
  const score = Number(RATING.score);

  return (
    <span className={`review-score review-score--${tone}`}>
      {/* Filled to the decimal, not rounded: four stars and a third, because a
          4.3 dressed as five stars is the one thing a rating must not do. */}
      <span className="review-score__stars" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, score - i));
          return (
            <span key={i} className="review-score__star">
              <Star size={15} strokeWidth={2} className="review-score__star-base" />
              <span className="review-score__star-fill" style={{ width: `${fill * 100}%` }}>
                <Star size={15} strokeWidth={2} fill="currentColor" />
              </span>
            </span>
          );
        })}
      </span>

      <span className="review-score__text">
        <strong>{RATING.score}</strong>
        {/* The mark is the attribution. The count is opt-in: in the trust band
            it would be a third number in a row of them, but in the hero it is
            the half of the rating that carries the weight — a 4.3 from four
            people and a 4.3 from eighty-one are not the same claim, and the
            second one is the one worth making. */}
        {count && <span className="review-score__count">({RATING.count})</span>}
        <GoogleG size={15} />
      </span>
    </span>
  );
}
