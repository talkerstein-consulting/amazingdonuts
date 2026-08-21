import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Wedge from "./Wedge.jsx";
import {
  BASES, ICINGS, SPRINKLES, FILLINGS, RULES, STEP_NOTES,
  baseArt, icingArt, fillingArt, toppingArt, byId, describe
} from "../data/builder.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";

/* Build your own product.
   Four layers, twelve shapes, and a sheet of rules about what may sit on what.
   The rules live in data/builder.js — this file only asks them questions. */

const initial = {
  baseId: "round",
  icingId: "pink",
  fillingId: "none",
  sprinkleId: "rainbow",
  colourNote: "",
  print: null,
  seq: 0,           /* bumped on every change so "done" can replay its cheer */
  popSeq: 0         /* bumped only on changes that should replay the full pop —
                        base and icing get their own quieter transitions instead */
};

function reducer(state, action) {
  switch (action.type) {
    case "base": {
      const next = { ...state, baseId: action.id, seq: state.seq + 1 };
      /* A new shape can invalidate what was already chosen. Clear it rather
         than quietly sending an impossible order to the counter. */
      if (!RULES.takesFilling(action.id)) next.fillingId = "none";
      if (!RULES.sprinkleAllowed(action.id, state.sprinkleId)) next.sprinkleId = "none";
      if (!RULES.takesPrint(action.id)) next.print = null;
      return next;
    }
    case "icing": {
      const next = { ...state, icingId: action.id, seq: state.seq + 1 };
      if (!RULES.takesSprinkles(action.id)) {
        next.sprinkleId = "none";
        next.colourNote = "";
      }
      return next;
    }
    case "filling":
      return { ...state, fillingId: action.id, seq: state.seq + 1, popSeq: state.popSeq + 1 };
    case "sprinkle": {
      const next = { ...state, sprinkleId: action.id, seq: state.seq + 1, popSeq: state.popSeq + 1 };
      if (action.id !== "whip-color") next.colourNote = "";
      return next;
    }
    case "colourNote":
      return { ...state, colourNote: action.value };
    case "print":
      return { ...state, print: action.file, seq: state.seq + 1, popSeq: state.popSeq + 1 };
    case "surprise":
      return { ...action.build, colourNote: "", print: null, seq: state.seq + 1, popSeq: state.popSeq + 1 };
    case "reset":
      return { ...initial, seq: state.seq + 1, popSeq: state.popSeq + 1 };
    default:
      return state;
  }
}

/* Sprinkle art is still being drawn, so the chips draw themselves: a few
   marks in the right shape and colours. Deterministic — no reshuffle on
   re-render. */
function SprinkleMark({ sprinkle }) {
  if (!sprinkle.shape) return <i className="bld__chipNone" aria-hidden="true" />;
  const n = sprinkle.shape === "swirl" ? 3 : 7;
  return (
    <span className={`bld__marks bld__marks--${sprinkle.shape}`} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <i
          key={i}
          style={{
            background: sprinkle.colors[i % sprinkle.colors.length],
            left: `${12 + ((i * 37) % 74)}%`,
            top: `${16 + ((i * 53) % 64)}%`,
            transform: `rotate(${(i * 47) % 180 - 90}deg)`
          }}
        />
      ))}
    </span>
  );
}

export default function DonutBuilder({ availability, onAddToCart, orderingReady }) {
  const [s, dispatch] = useReducer(reducer, initial);
  const reduced = useReducedMotion();
  const fileRef = useRef(null);
  const [cheer, setCheer] = useState(null);

  const base     = byId(BASES, s.baseId);
  const icing    = byId(ICINGS, s.icingId);
  const filling  = byId(FILLINGS, s.fillingId);
  const sprinkle = byId(SPRINKLES, s.sprinkleId);

  const canFill   = RULES.takesFilling(s.baseId);
  const canTop    = RULES.takesSprinkles(s.icingId);
  const canPrint  = RULES.takesPrint(s.baseId);
  const asksColour = s.sprinkleId === "whip-color";
  const available = useCallback(
    (group, id) => availability?.[group]?.[id] !== false,
    [availability]
  );

  /* The stack, bottom up. A filling is a whole dough, so it stands in for the
     plain base; icing and sprinkles are cut to their own shape and sit over it. */
  const layers = useMemo(() => {
    const ground = fillingArt(base, filling) || baseArt(base);
    return [
      { key: "ground", src: ground, z: 10 },
      { key: "icing", src: icingArt(base, icing), z: 20 },
      { key: "print", src: s.print ? "print" : null, z: 22 },
      { key: "top",   src: toppingArt(sprinkle), z: 30 }
    ].filter((l) => l.src);
  }, [base, icing, filling, sprinkle, s.print]);

  const line = describe({ base, icing, filling, sprinkle, printOn: !!s.print });
  const addToCart = () => onAddToCart({
    base,
    icing,
    filling,
    sprinkle,
    line,
    colourNote: s.colourNote,
    printName: s.print?.name || null
  });
  const printableOrderNeedsCall = Boolean(s.print);

  const surprise = useCallback(() => {
    const bases = BASES.filter((item) => available("bases", item.id));
    const b = bases[Math.floor(Math.random() * bases.length)];
    if (!b) return;
    const icings = ICINGS.filter((item) => !item.bare && available("icings", item.id));
    const ice = icings[Math.floor(Math.random() * icings.length)];
    const tops = SPRINKLES.filter((item) => !item.bare && available("sprinkles", item.id) && RULES.sprinkleAllowed(b.id, item.id));
    const fills = FILLINGS.filter((item) => !item.bare && available("fillings", item.id));
    if (!ice || !tops.length || (RULES.takesFilling(b.id) && !fills.length)) return;
    dispatch({
      type: "surprise",
      build: {
        baseId: b.id,
        icingId: ice.id,
        sprinkleId: tops[Math.floor(Math.random() * tops.length)].id,
        fillingId: RULES.takesFilling(b.id)
          ? fills[Math.floor(Math.random() * fills.length)].id
          : "none"
      }
    });
  }, [available]);

  /* A small cheer when the build is complete enough to be worth ordering.
     Tied to popSeq, not every change — base and icing get their own quieter
     transitions (a smooth resize and an iris-peel) instead of the full pop. */
  const done = !icing.bare && (!canFill || !filling.bare)
    && available("bases", base.id)
    && available("icings", icing.id)
    && available("fillings", filling.id)
    && available("sprinkles", sprinkle.id);
  useEffect(() => {
    if (!done) return;
    setCheer(s.popSeq);
    const t = setTimeout(() => setCheer(null), 900);
    return () => clearTimeout(t);
  }, [done, s.popSeq]);

  const chipProps = (active, disabled, reason) => ({
    type: "button",
    className: `bld__chip${active ? " is-on" : ""}${disabled ? " is-off" : ""}`,
    "aria-pressed": active,
    disabled,
    title: reason || undefined
  });

  return (
    <section className="bld" id="build-your-own">
      <div className="bld__in">
        <header className="bld__head">
          <p className="bld__eyebrow">Build your own</p>
          <h2>
            Start with a shape.
            <br />
            Argue with yourself after.
          </h2>
          <p className="bld__body">
            Twelve things to start from, ten icings, a drawer of sprinkles, and a filling if the
            shape has room for one. Some combinations we cannot do — those grey out and tell you
            why, so nothing gets promised that the fryer will not deliver.
          </p>
        </header>

        <div className="bld__grid">
          {/* ---------------- stage ---------------- */}
          <div className="bld__stageWrap">
            <div className="bld__stage" data-family={base.family}>
              <span className="bld__ground" />
              <div
                className={`bld__art${cheer === s.popSeq && !reduced ? " is-pop" : ""}`}
                key={s.popSeq}
                style={{ "--baseScale": base.scale ?? 1 }}
              >
                {layers.map((l) =>
                  l.key === "print" ? (
                    <span className="bld__layer bld__print" style={{ zIndex: l.z }} key={l.key}>
                      <span
                        className="bld__printDisc"
                        style={
                          s.print?.url
                            ? { backgroundImage: `url(${s.print.url})`, backgroundSize: "cover", backgroundPosition: "center", border: "none" }
                            : undefined
                        }
                      >
                        {s.print?.url ? null : "Your art"}
                      </span>
                    </span>
                  ) : (
                    <img
                      key={l.key === "icing" ? `icing-${s.icingId}` : l.key}
                      className={`bld__layer${l.key === "icing" ? " bld__icing" : ""}`}
                      style={{ zIndex: l.z }}
                      src={l.src}
                      alt=""
                      draggable="false"
                    />
                  )
                )}
              </div>

              <p className="bld__read">{line}</p>
            </div>

            <div className="bld__stageActs">
              <Wedge label="Surprise Me" family="sunshine" small onClick={surprise} />
              <button className="bld__plain" type="button" onClick={() => dispatch({ type: "reset" })}>
                Start over
              </button>
            </div>
          </div>

          {/* ---------------- steps ---------------- */}
          <div className="bld__steps">
            {/* 1 · base */}
            <section className="bld__step">
              <h3 className="bld__stepH"><i>1</i> The shape</h3>
              <p className="bld__stepNote">{STEP_NOTES.base}</p>
              <div className="bld__row bld__row--bases">
                {BASES.map((b) => (
                  <button
                    key={b.id}
                    {...chipProps(b.id === s.baseId, !available("bases", b.id), !available("bases", b.id) ? "Sold out in Square" : null)}
                    className={`bld__base${b.id === s.baseId ? " is-on" : ""}`}
                    data-family={b.family}
                    aria-pressed={b.id === s.baseId}
                    onClick={() => dispatch({ type: "base", id: b.id })}
                  >
                    <span className="bld__baseArt" style={{ backgroundImage: `url(${baseArt(b)})` }} />
                    <span className="bld__baseName">{b.name}</span>
                    <span className="bld__baseNote">{b.note}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 2 · icing */}
            <section className="bld__step">
              <h3 className="bld__stepH"><i>2</i> The icing</h3>
              <p className="bld__stepNote">{STEP_NOTES.icing}</p>
              <div className="bld__row">
                {ICINGS.map((i) => (
                  <button
                    key={i.id}
                    {...chipProps(i.id === s.icingId, !available("icings", i.id), !available("icings", i.id) ? "Sold out in Square" : null)}
                    onClick={() => dispatch({ type: "icing", id: i.id })}
                  >
                    {i.bare ? (
                      <i className="bld__chipNone" aria-hidden="true" />
                    ) : (
                      <i className="bld__dot" style={{ background: i.swatch }} aria-hidden="true" />
                    )}
                    <span>{i.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 3 · filling — only when the shape has an inside */}
            <section className={`bld__step${canFill ? "" : " is-shut"}`}>
              <h3 className="bld__stepH">
                <i>3</i> The filling
                {canFill ? null : <em className="bld__gate">Sofgania and Boston only</em>}
              </h3>
              {canFill ? (
                <>
                  <p className="bld__stepNote">{STEP_NOTES.filling}</p>
                  <div className="bld__row">
                    {FILLINGS.map((f) => (
                      <button
                        key={f.id}
                        {...chipProps(f.id === s.fillingId, !available("fillings", f.id), !available("fillings", f.id) ? "Sold out in Square" : null)}
                        onClick={() => dispatch({ type: "filling", id: f.id })}
                      >
                        {f.bare ? (
                          <i className="bld__chipNone" aria-hidden="true" />
                        ) : (
                          <i className="bld__dot" style={{ background: f.swatch }} aria-hidden="true" />
                        )}
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="bld__shutNote">
                  {base.name} has no inside to fill. Switch to a Sofgania or Boston and this opens
                  up.
                </p>
              )}
            </section>

            {/* 4 · sprinkles */}
            <section className={`bld__step${canTop ? "" : " is-shut"}`}>
              <h3 className="bld__stepH">
                <i>4</i> The sprinkles
                {canTop ? null : <em className="bld__gate">Needs icing first</em>}
              </h3>
              {canTop ? (
                <>
                  <p className="bld__stepNote">{STEP_NOTES.sprinkle}</p>
                  <div className="bld__row bld__row--tops">
                    {SPRINKLES.map((p) => {
                      const inStock = available("sprinkles", p.id);
                      const ok = inStock && RULES.sprinkleAllowed(s.baseId, p.id);
                      const why = inStock ? RULES.sprinkleReason(s.baseId, p.id, s.icingId) : "Sold out in Square";
                      return (
                        <button
                          key={p.id}
                          {...chipProps(p.id === s.sprinkleId, !ok, why)}
                          onClick={() => dispatch({ type: "sprinkle", id: p.id })}
                        >
                          <SprinkleMark sprinkle={p} />
                          <span>{p.name}</span>
                          {p.parve ? <em className="bld__tag">Parve</em> : null}
                          {!ok && why ? <em className="bld__why">{why}</em> : null}
                        </button>
                      );
                    })}
                  </div>

                  {asksColour ? (
                    <label className="bld__ask">
                      <span className="bld__askH">Which colours? Tell us here.</span>
                      <input
                        type="text"
                        value={s.colourNote}
                        maxLength={120}
                        placeholder="e.g. pale blue and white, nothing pink"
                        onChange={(e) => dispatch({ type: "colourNote", value: e.target.value })}
                      />
                    </label>
                  ) : null}
                </>
              ) : (
                <p className="bld__shutNote">
                  Nothing to hold them on. Pick an icing and the drawer opens.
                </p>
              )}
            </section>

            {/* 5 · print — round donut only */}
            <section className={`bld__step${canPrint ? "" : " is-shut"}`}>
              <h3 className="bld__stepH">
                <i>5</i> Print your own
                {canPrint ? null : <em className="bld__gate">3&quot; round, round donut only</em>}
              </h3>
              {canPrint ? (
                <>
                  <p className="bld__stepNote">{STEP_NOTES.print}</p>
                  <div className="bld__upload">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () =>
                          dispatch({ type: "print", file: { name: f.name, url: reader.result } });
                        reader.readAsDataURL(f);
                      }}
                    />
                    <button className="bld__drop" type="button" onClick={() => fileRef.current?.click()}>
                      <span
                        className="bld__dropDisc"
                        style={s.print ? { backgroundImage: `url(${s.print.url})`, backgroundSize: "cover", border: "none" } : undefined}
                      />
                      <span>
                        {s.print ? s.print.name : "Choose your artwork"}
                        <em>{s.print ? "Tap to swap it" : 'Square or round, 3" at 300dpi'}</em>
                      </span>
                    </button>
                    {s.print ? (
                      <button className="bld__plain" type="button" onClick={() => dispatch({ type: "print", file: null })}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="bld__shutNote">
                  The edible print is a 3&quot; round. It goes on a Round Donut — pick that shape to
                  send us artwork.
                </p>
              )}
            </section>

            <div className="bld__foot">
              <div className="bld__summaryWrap">
                <p className="bld__summary">{line}</p>
                {printableOrderNeedsCall ? (
                  <p className="bld__orderNote">Your artwork is previewed only, not uploaded. Printed orders need bakery confirmation by phone.</p>
                ) : null}
              </div>
              <div className="bld__acts">
                {printableOrderNeedsCall ? (
                  <Wedge label="Call About This Print" href="tel:+14163987546" family="magenta" />
                ) : (
                  <Wedge
                    label="Add to Cart"
                    family="magenta"
                    onClick={addToCart}
                    disabled={!done || !orderingReady}
                    title={!done ? "Finish the donut first" : !orderingReady ? "Connecting to Square" : undefined}
                  />
                )}
                <Wedge label="Call the Bakery" href="tel:+14163987546" family="sky" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
