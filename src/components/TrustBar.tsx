import LogoLoop from './LogoLoop';
import { Badge, BadgeDot } from './brand';
import type { BadgeKey } from './brand';
import KosherBadge from './KosherBadge';
import type { KosherKey } from './KosherBadge';

/**
 * The certification band, directly under the hero.
 *
 * Its other two occupants have both moved up into the hero itself, which is
 * where the trust signals earn their keep: the Google score now sits beside the
 * CTA, and the Proudly Canadian seal is stamped over the donut. What is left is
 * the loop of kosher and allergen marks, and it stays here for a second reason
 * beyond its own — the hero's donut hangs down into this band, and this moving
 * text is what cuts across it.
 */
const ALLERGEN: BadgeKey[] = ['nut', 'dairy', 'sesame'];
const KOSHER: KosherKey[] = ['cor', 'pareve', 'yoshon'];

/* Both kinds are set the same way — icon, label, no container — so the two
   sets read as one family. The ring these used to wear is gone: a loop of
   ringed pills reads as a row of buttons scrolling past, and none of them is
   pressable. */
const MARK = {
  color: 'var(--cream)',
  whiteSpace: 'nowrap'
} as const;

const DOT = { color: 'var(--cream)' } as const;

/* Interleaved rather than grouped, so a single pass of the loop always shows
   a mix instead of three of one kind then three of the other.

   Each mark is followed by its own dot rather than the dots being set between
   pairs: the loop is a ring with no first or last item, so a divider that
   skipped the final seam would leave one gap in every revolution. */
const LOGOS = ALLERGEN.flatMap((key, i) => [
  { node: <Badge badge={key} forceOutline style={MARK} />, ariaLabel: key },
  { node: <BadgeDot style={DOT} />, ariaLabel: '' },
  { node: <KosherBadge badge={KOSHER[i]} style={MARK} />, ariaLabel: KOSHER[i] },
  { node: <BadgeDot style={DOT} />, ariaLabel: '' }
]);

export default function TrustBar() {
  return (
    <section className="trust-band" aria-label="Certifications">
      <div className="trust-marks">
        <LogoLoop
          logos={LOGOS}
          speed={60}
          logoHeight={34}
          gap={20}
          fadeOut
          fadeOutColor="#0e3e69"
          pauseOnHover
          ariaLabel="Certifications"
          style={{ width: '100%' }}
        />
      </div>

    </section>
  );
}
