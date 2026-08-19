import { useCallback, useEffect, useRef, useState } from "react";
import Wedge from "./Wedge.jsx";
import { COMPLIMENTS, FLAVOURS, art, boxNote, pick } from "../data/flavours.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";

const SPRINKLE_COLORS = ["#00A3DC", "#C4008C", "#F6B316", "#A8D9EF", "#F2A8D6", "#FBDD9C"];
const COUNT_WORD = { 6: "six", 8: "eight", 10: "ten", 12: "twelve" };

/**
 * Build a box — from the interface handoff.
 * Tapping a flavour flies the donut into the next empty slot; tapping a filled
 * slot takes it back out; closing a full lid fires the compliment banner.
 */
export default function BuildABox({ box, limit, add, removeAt, reset }) {
  const slots = box.slots;
  const filled = slots.filter(Boolean);
  const full = filled.length >= limit;
  const total = filled.reduce((t, f) => t + f.price, 0);

  const [closed, setClosed] = useState(false);
  const [banner, setBanner] = useState(null);
  const [short, setShort] = useState(null);   /* "close" | "call" when the dozen is short */
  const [flight, setFlight] = useState(null);
  const reduced = useReducedMotion();

  const slotRefs = useRef([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const after = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  /* A copy of the donut flies from the card to the slot, then the slot fills. */
  const takeFlight = useCallback(
    (flavour, sourceEl) => {
      if (full) return;
      const target = slots.indexOf(null);
      const from = sourceEl?.getBoundingClientRect();
      const to = slotRefs.current[target]?.getBoundingClientRect();

      if (reduced || !from || !to) {
        add(flavour);
        return;
      }

      setFlight({
        img: art(flavour),
        x: from.left,
        y: from.top,
        w: from.width,
        h: from.height,
        dx: to.left + to.width / 2 - (from.left + from.width / 2),
        dy: to.top + to.height / 2 - (from.top + from.height / 2),
        scale: (to.width * 1.1) / from.width,
        moving: false
      });

      requestAnimationFrame(() =>
        requestAnimationFrame(() => setFlight((f) => (f ? { ...f, moving: true } : f)))
      );
      after(440, () => {
        setFlight(null);
        add(flavour);
      });
    },
    [add, full, reduced, slots]
  );

  const remaining = limit - filled.length;

  /* Closing the lid or calling with a short box asks first. */
  const closeLid = () => {
    if (closed) {
      setClosed(false);
      return;
    }
    if (!full) {
      setShort("close");
      return;
    }
    setClosed(true);
    setBanner(pick(COMPLIMENTS));
  };

  const callBakery = (e) => {
    if (full) return;                 /* a full box just dials */
    e.preventDefault();
    setShort("call");
  };

  const closeAnyway = () => {
    setShort(null);
    setClosed(true);
    if (full) setBanner(pick(COMPLIMENTS));
  };

  const word = COUNT_WORD[limit] || limit;

  return (
    <section className="bab" id="build">
      <div className="bab__in">
        <div>
          <p className="bab__eyebrow">The main event</p>
          <h2>
            Fill the box.
            <br />
            It holds {word}.
          </h2>
          <p className="bab__body">
            Tap a flavour and it lands in the next slot. Tap a donut in the box to take it back
            out. Close the lid when it looks right, then bring the list to the counter or call it
            in — we will have it boxed.
          </p>

          <div className="bab__grid">
            {FLAVOURS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="flav"
                data-family={f.family}
                aria-label={`Add ${f.name}, $${f.price.toFixed(2)}, to the box`}
                onClick={(e) => takeFlight(f, e.currentTarget.querySelector(".flav__art"))}
              >
                <span className="flav__back" />
                <span className="flav__art" style={{ backgroundImage: `url(${art(f)})` }} />
                <span className="flav__name">{f.name}</span>
                <span className="flav__price">${f.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bab__box">
          <div className="boxlid">
            <span>Amazing Donuts · {limit} count</span>
          </div>

          <div className="boxbody">
            <div className="boxtray">
              <div className="boxslots">
                {slots.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    ref={(n) => (slotRefs.current[i] = n)}
                    className={`slot${f ? " slot--filled" : ""}`}
                    disabled={!f}
                    aria-label={f ? `${f.name} in slot ${i + 1}. Take it out.` : `Slot ${i + 1}, empty`}
                    onClick={() => removeAt(i)}
                  >
                    {f ? <span className="slot__art" style={{ backgroundImage: `url(${art(f)})` }} /> : null}
                  </button>
                ))}
              </div>
            </div>

            {closed ? (
              <button className="boxclosed" onClick={() => setClosed(false)} aria-label="Open the box">
                <span className="boxclosed__panel">
                  <img src="/assets/logo-amazing-donuts.webp" alt="Amazing Donuts" />
                  <span className="boxclosed__count">
                    {limit} count · boxed up
                  </span>
                  <span className="boxclosed__hint">Tap the lid to look again</span>
                </span>
              </button>
            ) : null}
          </div>

          <div className="boxcount">
            <span className="boxcount__n">{filled.length}</span>
            <span className="boxcount__of">of {limit}</span>
            <span className="boxcount__total">${total.toFixed(2)}</span>
          </div>

          <div className="boxticks">
            {slots.map((f, i) => (
              <i key={i} className={f ? "on" : ""} />
            ))}
          </div>

          <p className="boxnote">{boxNote(filled.length, limit, closed)}</p>

          <div className="boxacts">
            <Wedge label="Call the Bakery" href="tel:+14163987546" family="magenta" biteBg="#E4F2FA" onClick={callBakery} />
            <Wedge
              label={closed && full ? "Open the Box" : "Close the Lid"}
              family="sky"
              biteBg="#E4F2FA"
              onClick={closeLid}
            />
            <button className="boxacts__empty" type="button" onClick={reset}>
              Empty the box
            </button>
          </div>
        </div>
      </div>

      {flight ? (
        <span
          className="flight"
          style={{
            backgroundImage: `url(${flight.img})`,
            left: flight.x,
            top: flight.y,
            width: flight.w,
            height: flight.h,
            transform: flight.moving
              ? `translate(${flight.dx}px, ${flight.dy}px) scale(${flight.scale})`
              : "translate(0, 0) scale(1)",
            transition: flight.moving ? "transform 440ms cubic-bezier(.34,1.56,.64,1)" : "none"
          }}
        />
      ) : null}

      {short ? (
        <div className="short" role="dialog" aria-modal="true" aria-label="The box is not full yet">
          <button className="short__scrim" aria-label="Close" onClick={() => setShort(null)} />
          <div className="short__card">
            <p className="short__eyebrow">Hold on a second</p>
            <h3 className="short__title">
              {remaining === 1 ? "One slot is still empty." : `${remaining} slots are still empty.`}
            </h3>
            <p className="short__body">
              {short === "call"
                ? `You have ${filled.length} of ${limit}. We are happy to box a short order — but the dozen is the better deal, and the box is going to look at you.`
                : `The lid closes over ${remaining} empty ${remaining === 1 ? "slot" : "slots"}. Fill them and it travels better.`}
            </p>

            <div className="short__gaps">
              {slots.map((f, i) => (
                <i key={i} className={f ? "on" : ""} />
              ))}
            </div>

            <div className="short__acts">
              <Wedge label="Keep Choosing" family="sky" biteBg="#FCF4E7" onClick={() => setShort(null)} />
              {short === "call" ? (
                <a className="short__skip" href="tel:+14163987546">
                  Call anyway
                </a>
              ) : (
                <button className="short__skip" type="button" onClick={closeAnyway}>
                  Close it anyway
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {banner ? (
        <button className="compliment" onClick={() => setBanner(null)} aria-label="Dismiss">
          {Array.from({ length: 26 }).map((_, i) => (
            <span
              key={i}
              className="compliment__sprinkle"
              style={{
                left: `${(i * 3.9 + 2) % 100}%`,
                background: SPRINKLE_COLORS[i % SPRINKLE_COLORS.length],
                animation: `adFall ${1500 + ((i * 137) % 1280)}ms linear ${(i % 9) * 90}ms forwards`
              }}
            />
          ))}
          <span className="compliment__bar">
            <span>{banner}</span>
          </span>
        </button>
      ) : null}
    </section>
  );
}
