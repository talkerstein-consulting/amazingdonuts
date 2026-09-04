import { Star } from 'lucide-react';
import GoogleG from './GoogleG';
import { RATING, REVIEWS_ANCHOR } from '../data/reviews';

/**
 * The Google score, as a link to the reviews it summarises.
 *
 * Lives beside the hero's CTA rather than in the trust band below it: the
 * score is the single strongest thing a first-time visitor can be told, and
 * next to the button is the moment they are deciding whether to press it.
 *
 * `tone` is which ground it is sitting on. On Canvas it takes the ink; the
 * navy variant stays for the trust band's own use of it.
 */
export default function ReviewScore({ tone = 'ink' }: { tone?: 'ink' | 'cream' }) {
  const score = Number(RATING.score);

  return (
    <a className={`review-score review-score--${tone}`} href={REVIEWS_ANCHOR}>
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
        {/* The mark is the attribution. The review count used to follow it and
            was the third number in a row beside the CTA — the score and the
            stars already say the same thing, and the count is on the reviews
            page this links to. */}
        <GoogleG size={15} />
      </span>
    </a>
  );
}
