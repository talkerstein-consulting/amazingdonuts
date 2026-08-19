import { useCallback, useEffect, useRef, useState } from "react";
import Wedge from "./Wedge.jsx";
import { FLAVOURS, QUOTES, art, pick } from "../data/flavours.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";

const CELL = 144;                       /* reel cell height, matches the CSS */
const STOPS = [760, 1120, 1500];        /* staggered reel landings */
const SPRAY_COLORS = ["#00A3DC", "#C4008C", "#F6B316", "#A8D9EF", "#F2A8D6", "#FBDD9C"];

/**
 * Jackpot Donut Slot — from the interface handoff.
 * The result is decided before the reels stop: a flavour is forced into at
 * least two reels, and roughly one pull in five is a triple.
 */
export default function JackpotSlot({ onTake, boxFull }) {
  const reduced = useReducedMotion();

  const [spinning, setSpinning] = useState(false);
  const [reelIds, setReelIds] = useState(["zap", "barbie", "glazed"]);
  const [stopped, setStopped] = useState(3);
  const [result, setResult] = useState(null);
  const [triple, setTriple] = useState(false);
  const [dispensed, setDispensed] = useState(false);
  const [ticketPhase, setTicketPhase] = useState("hidden");
  const [spraying, setSpraying] = useState(false);
  const [quote, setQuote] = useState(null);
  const [pulled, setPulled] = useState(false);

  const timers = useRef([]);
  const shuffle = useRef(null);
  const landedRef = useRef([null, null, null]);   /* ids the shuffle must not touch */
  const after = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      clearInterval(shuffle.current);
    },
    []
  );

  const spin = useCallback(() => {
    if (spinning) return;

    const winner = pick(FLAVOURS);
    const isTriple = Math.random() < 0.2;
    const odd = pick(FLAVOURS.filter((f) => f.id !== winner.id));
    const faces = isTriple
      ? [winner.id, winner.id, winner.id]
      : [winner.id, winner.id, odd.id].sort(() => Math.random() - 0.5);

    const start = () => {
      landedRef.current = [null, null, null];
      setSpinning(true);
      setStopped(0);
      setPulled(true);
      after(520, () => setPulled(false));

      /* ids shuffle while the strip scrolls, purely for texture — a reel that
         has already landed keeps its face, or the forced result is lost */
      shuffle.current = setInterval(
        () =>
          setReelIds((ids) =>
            ids.map((id, k) => (landedRef.current[k] ? landedRef.current[k] : pick(FLAVOURS).id))
          ),
        80
      );

      STOPS.forEach((ms, i) => {
        after(reduced ? 60 * (i + 1) : ms, () => {
          landedRef.current[i] = faces[i];
          setReelIds((ids) => ids.map((id, k) => (k === i ? faces[i] : id)));
          setStopped(i + 1);
          if (i === 2) {
            clearInterval(shuffle.current);
            setSpinning(false);
            setResult(winner);
            setTriple(isTriple);
            setQuote(pick(QUOTES));

            after(360, () => {
              setDispensed(true);
              setTicketPhase("out");
              setSpraying(true);
              after(1600, () => setSpraying(false));
            });
          }
        });
      });
    };

    /* an existing ticket drops away before the next spin */
    if (ticketPhase === "out") {
      setTicketPhase("fall");
      after(520, () => {
        setTicketPhase("hidden");
        start();
      });
    } else {
      start();
    }
  }, [reduced, spinning, ticketPhase]);

  const status = spinning
    ? "Rolling…"
    : !dispensed
      ? "Ready — pull the lever"
      : triple
        ? "Triple — take two"
        : "Pair — your flavour";

  /* doubled strip so the scroll loop is seamless */
  const strip = [...FLAVOURS, ...FLAVOURS];

  return (
    <section className="slotm2" id="machine">
      <div className="slotm2__in">
        <div>
          <p className="slotm2__eyebrow">For the chronically indecisive</p>
          <h2>The Indecision Machine.</h2>
          <p className="slotm2__body">
            Four minutes at the case, a line forming behind you, still no decision. Pull the lever
            and let the cabinet take responsibility. Whatever prints on the ticket is what you are
            having.
          </p>
          <Wedge label="Pull the Lever" family="magenta" biteBg="#FFFFFF" onClick={spin} />
          <p className="slotm2__line">Order two. You will want the second one on the drive home.</p>
        </div>

        <div className="cab__wrap">
          <div className={`cab${spinning ? " cab--spin" : ""}`}>
            <div className="cab__crown">
              <div className="cab__bulbs">
                {Array.from({ length: 9 }).map((_, i) => (
                  <i key={i} />
                ))}
              </div>
              <div className="cab__marquee">
                <b>Jackpot</b>
                <span>Donut slot</span>
              </div>
            </div>

            <div className="cab__screen">
              <div className="cab__bezel">
                <div className="cab__reels">
                  {[0, 1, 2].map((i) => {
                    const landedIndex = FLAVOURS.findIndex((f) => f.id === reelIds[i]);
                    const isSpinning = spinning && stopped <= i;
                    return (
                      <div key={i} className={`reel2${isSpinning ? " reel2--spin" : ""}`}>
                        <div
                          className="reel2__strip"
                          style={
                            isSpinning
                              ? undefined
                              : {
                                  transform: `translateY(-${landedIndex * CELL}px)`,
                                  transition: "transform 420ms cubic-bezier(.34,1.56,.64,1)"
                                }
                          }
                        >
                          {strip.map((f, k) => (
                            <span className="reel2__cell" key={`${f.id}-${k}`}>
                              <i style={{ backgroundImage: `url(${art(f)})` }} />
                            </span>
                          ))}
                        </div>
                        <span className="reel2__vig" />
                      </div>
                    );
                  })}
                </div>
                <div className="cab__pegs">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <i key={i} />
                  ))}
                </div>
              </div>
            </div>

            <p className="cab__status">{status}</p>
            <div className="cab__deck" />

            <div className="cab__base">
              <div className="cab__chute">
                <span className="cab__door" data-open={spraying || ticketPhase === "out"} />
                {spraying ? (
                  <span className="cab__spray">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <i
                        key={i}
                        style={{
                          left: `${8 + i * 4.4}%`,
                          background: SPRAY_COLORS[i % SPRAY_COLORS.length],
                          "--sx": `${-100 + ((i * 37) % 200)}px`,
                          animation: `adSpray ${760 + ((i * 91) % 720)}ms cubic-bezier(.2,.7,.4,1) ${(i % 8) * 44}ms forwards`
                        }}
                      />
                    ))}
                  </span>
                ) : null}
              </div>
              <span className="cab__chutelabel">Ticket chute</span>

              {/* the lever is a child of .cab__base — position: relative on the
                  base is what actually anchors it, not a percentage of the
                  whole cabinet's height */}
              <button
                className="cab__lever"
                type="button"
                data-pulled={pulled}
                aria-label="Pull the lever"
                onClick={spin}
              >
                <i className="lever__house" />
                <i className="lever__pivot" />
                <i className="lever__arm" />
                <i className="lever__knob" />
              </button>
            </div>
          </div>

          <div className="cab__bay">
            {!dispensed ? (
              <p className="cab__bayidle">
                Your ticket prints
                <br />
                from the chute.
              </p>
            ) : null}

            {result ? (
              <div className="ticket" data-phase={ticketPhase}>
                <span className="ticket__tear ticket__tear--top" />
                <div className="ticket__head">
                  <span className="ticket__art" style={{ backgroundImage: `url(${art(result)})` }} />
                  <div>
                    <p className="ticket__name">{result.name}</p>
                    <p className="ticket__price">${result.price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="ticket__rule" />
                <p className="ticket__quote">“{quote?.[0]}”</p>
                <p className="ticket__by">— {quote?.[1]}</p>
                <span className="ticket__tear ticket__tear--bottom" />
              </div>
            ) : null}
          </div>

          {result && ticketPhase === "out" ? (
            <div className="cab__take">
              <Wedge
                label={triple ? "Take Two" : "Take It"}
                family="sky"
                small
                onClick={() => {
                  onTake(result);
                  if (triple && !boxFull) onTake(result);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
