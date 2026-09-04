import { Clock, X } from 'lucide-react';
import { PICKUP_HREF } from '../lib/routes';
import { clearPickup, formatPickup, usePickup } from '../lib/pickup';

/**
 * The chosen pickup slot, as a band across the very top of the page.
 *
 * It was a chip inside the navbar, competing for the bar's width with the nav
 * links, search, account and the box — and losing, since it had to hide its own
 * "Pickup" label below 1120px to fit. An appointment the visitor has made is
 * page-level state, not a nav control, so it gets a band of its own.
 *
 * The band sticks directly under the header, which is itself sticky at `top:
 * 0`: an appointment is state that stays true while the visitor shops, so it
 * has to stay with them down the page rather than scroll away with the top of
 * it. `top: var(--nav-h)` is the one number the two share, and it is the same
 * variable the bar sizes itself with.
 *
 * Renders nothing at all when no slot is set, which is every visitor who came
 * in through Delivery or Bulk: an empty band would push the whole page down to
 * say nothing.
 */
export default function PickupBanner() {
  const pickup = usePickup();
  const label = formatPickup(pickup);
  if (!label) return null;

  return (
    <div className="pickup-banner">
      <div className="pickup-banner__inner">
        <Clock size={15} strokeWidth={2.6} aria-hidden="true" />
        <p>
          <span className="pickup-banner__lead">Pickup booked</span>
          <strong>{label}</strong>
        </p>

        {/* Change, not just view: the band is the only place the slot appears
            now, so it has to be the way back to the gate that set it. */}
        <a href={PICKUP_HREF}>Change</a>

        {/* And a way to abandon it. Without this a visitor who picked a slot
            and then decided to order for delivery had no way to drop it short
            of clearing site data. */}
        <button
          type="button"
          onClick={clearPickup}
          aria-label="Cancel this pickup time"
          title="Cancel this pickup time"
        >
          <X size={15} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
