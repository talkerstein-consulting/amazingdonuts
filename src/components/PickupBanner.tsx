import { Clock, Truck, X } from 'lucide-react';
import { clearPickup, formatPickup, isClosed, localDate, pickupSlots, usePickup, writePickup } from '../lib/pickup';
import {
  clearFulfillmentPreference,
  useFulfillmentChoice,
  writeFulfillmentPreference
} from '../lib/fulfillment';
import { PICKUP_HREF } from '../lib/routes';

/**
 * How this order is being collected, as a band across the very top of the page.
 *
 * It was a chip inside the navbar, competing for the bar's width with the nav
 * links, search, account and the bag — and losing, since it had to hide its own
 * "Pickup" label below 1120px to fit. How an order is being collected is
 * page-level state, not a nav control, so it gets a band of its own.
 *
 * Both halves of the choice show here now. Picking Delivery on the homepage
 * wrote a preference that only checkout ever read, so a visitor who chose it
 * shopped the whole catalogue with no sign the choice had registered — and then
 * met a delivery minimum they had never been told about. Pickup had a band
 * because it also has a time; delivery has no time, which is why it had
 * nothing, not because it deserved nothing.
 *
 * The band sticks directly under the header, which is itself sticky at `top:
 * 0`: this is state that stays true while the visitor shops, so it has to stay
 * with them down the page rather than scroll away with the top of it.
 * `top: var(--nav-h)` is the one number the two share, and it is the same
 * variable the bar sizes itself with.
 *
 * Renders nothing at all until a choice has actually been made — see
 * `readFulfillmentChoice`, which is why the preference has two readings. An
 * empty band would push the whole page down to say nothing, and a band reading
 * "Pickup" on a first visit would be stating a decision nobody had taken.
 *
 * The pickup slot is changed in the band itself — day and time are two selects
 * sitting in the line, not a sentence with a "Change" button that opens a panel
 * under it. Moving an appointment by half an hour is a two-field edit, and a
 * panel made a two-field edit into three interactions: open, change, dismiss.
 * The selects ARE the statement of the booking, so there is nothing to
 * duplicate.
 */

/** How far ahead the day list runs. Two weeks of open days is the horizon the
    gate itself offers, and past that the bakery would rather take a call. */
const HORIZON_DAYS = 21;

function openDays() {
  const days: { value: string; label: string }[] = [];
  const probe = new Date();
  for (let i = 0; i < HORIZON_DAYS && days.length < 14; i += 1) {
    if (!isClosed(probe)) {
      const value = localDate(probe);
      days.push({
        value,
        label: new Intl.DateTimeFormat('en-CA', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }).format(probe)
      });
    }
    probe.setDate(probe.getDate() + 1);
  }
  return days;
}

export default function PickupBanner() {
  const pickup = usePickup();
  const choice = useFulfillmentChoice();

  /* A stored slot that no longer makes sense — last Tuesday, or a window on a
     day the counter has since closed — reads as no slot at all. */
  const booked = pickup && formatPickup(pickup) ? pickup : null;

  /* Delivery is shown on the choice alone; pickup on the choice OR a live
     booking, since the pickup gate writes a slot and the preference together
     and either one arriving first should raise the band. */
  const mode = choice ?? (booked ? 'pickup' : null);
  if (!mode) return null;

  if (mode === 'delivery') {
    return (
      <div className="pickup-banner pickup-banner--delivery">
        <div className="pickup-banner__inner">
          <Truck size={15} strokeWidth={2.6} aria-hidden="true" />
          <span className="pickup-banner__lead">Delivery</span>
          {/* No time to state, so the band spends its width on the one thing a
              delivery order has that a pickup order does not: terms it has to
              meet. The figures are the bakery's own, quoted at checkout from
              `/storefront/config`; this says the shape of them without
              claiming numbers the server has not sent yet. */}
          <span className="pickup-banner__note">Local delivery · fee and minimum shown at checkout</span>

          {/* Switching is a change of plan, not an edit of a field, so it goes
              back to the lanes rather than offering a control here. */}
          <a className="pickup-banner__swap" href={PICKUP_HREF}>
            Switch to pickup
          </a>

          <button
            type="button"
            onClick={clearFulfillmentPreference}
            className="pickup-banner__cancel"
            aria-label="Clear delivery"
            title="Clear delivery"
          >
            <X size={15} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    );
  }

  /* Pickup chosen, but no usable slot on file. Reachable by choosing pickup at
     checkout, or by a stored slot going stale overnight — and a band that said
     "Pickup" with no time would be the least useful version of itself. */
  if (!booked) {
    return (
      <div className="pickup-banner">
        <div className="pickup-banner__inner">
          <Clock size={15} strokeWidth={2.6} aria-hidden="true" />
          <span className="pickup-banner__lead">Pickup</span>
          <span className="pickup-banner__note">No time chosen yet</span>

          <a className="pickup-banner__swap" href={PICKUP_HREF}>
            Choose a time
          </a>

          <button
            type="button"
            onClick={() => {
              clearPickup();
              clearFulfillmentPreference();
            }}
            className="pickup-banner__cancel"
            aria-label="Clear pickup"
            title="Clear pickup"
          >
            <X size={15} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    );
  }

  const days = openDays();
  const slots = pickupSlots(booked.date);

  /* Moving the day can strand the time — Friday closes at 2pm and Monday runs
     to 4pm, so a 3:30 slot has nowhere to go on the shorter day. The nearest
     surviving window is taken rather than the edit being refused. */
  const changeDay = (date: string) => {
    const next = pickupSlots(date);
    if (!next.length) return;
    const kept = next.find((slot) => slot.value === booked.time) ?? next[0];
    writePickup({ date, time: kept.value });
  };

  return (
    <div className="pickup-banner">
      <div className="pickup-banner__inner">
        <Clock size={15} strokeWidth={2.6} aria-hidden="true" />
        <span className="pickup-banner__lead">Pickup</span>

        {/* Native selects, deliberately: two short, fixed lists, where the
            platform's own picker on a phone beats anything drawn here — and
            where a drawn one would need a popover, which is what this replaced. */}
        <select
          className="pickup-banner__select"
          aria-label="Pickup day"
          value={booked.date}
          onChange={(event) => changeDay(event.target.value)}
        >
          {/* A stored day beyond the horizon would otherwise select nothing and
              silently reset the field to the first option. */}
          {!days.some((day) => day.value === booked.date) && (
            <option value={booked.date}>{formatPickup(booked).split(' · ')[0]}</option>
          )}
          {days.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>

        <select
          className="pickup-banner__select"
          aria-label="Pickup time"
          value={booked.time}
          onChange={(event) => writePickup({ date: booked.date, time: event.target.value })}
        >
          {slots.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>

        {/* The opposite of what is booked, mirroring the delivery band's
            "Switch to pickup". It replaced "Keep shopping", which was a link
            to the page most visitors were already on — the band's one piece of
            spare width spent on a no-op.

            A button rather than a link: switching is a change of state on this
            page, not a navigation. It drops the slot with it, because a booked
            collection time is not a thing a delivery order has, and leaving one
            behind would put the band back the next time the preference was
            read. */}
        <button
          type="button"
          className="pickup-banner__swap"
          onClick={() => {
            clearPickup();
            writeFulfillmentPreference('delivery');
          }}
        >
          Switch to delivery
        </button>

        {/* And a way to abandon it. Without this a visitor who picked a slot
            and then decided to order for delivery had no way to drop it short
            of clearing site data. */}
        <button
          type="button"
          onClick={() => {
            clearPickup();
            clearFulfillmentPreference();
          }}
          className="pickup-banner__cancel"
          aria-label="Clear pickup"
          title="Clear pickup"
        >
          <X size={15} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
