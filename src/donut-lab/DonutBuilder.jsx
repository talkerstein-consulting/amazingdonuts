import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Repeat, Dices, Ban, ArrowLeft, Upload } from "lucide-react";
import Wedge from "./Wedge.jsx";
import Sprinkles from "./Sprinkles.jsx";
import {
  BASES, ICINGS, SPRINKLES, FILLINGS, RULES, STEP_NOTES,
  baseArt, icingArt, fillingArt, toppingArt, byId, describe, buildShapeItems
} from "./builder.js";
import { useReducedMotion } from "./useReducedMotion.js";

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

/* One card, used by every selector step. The art is a stack so a card can
   show the chosen layer sitting on the shape being built — an icing card is
   that icing on your donut, not an abstract swatch. */
function OptionCard({ layers = [], mark, name, note, active, disabled, title, onClick }) {
  return (
    <button
      type="button"
      className={`bld__base${active ? " is-on" : ""}${disabled ? " is-off" : ""}`}
      aria-pressed={active}
      disabled={disabled}
      title={title || undefined}
      onClick={onClick}
    >
      <span className="bld__baseArt bld__baseArt--stack">
        {layers.map((l) =>
          l.mask ? (
            /* Static here — the chips shouldn't all replay the drop on
               every re-render, only the stage does. */
            <span key={l.key} className="bld__cardLayer bld__cardTop">
              <Sprinkles src={l.src} colors={l.colors || []} />
            </span>
          ) : (
            <span key={l.key} className="bld__cardLayer" style={{ backgroundImage: `url(${l.src})` }} />
          )
        )}
        {mark ? <span className="bld__cardNone">{mark}</span> : null}
      </span>
      <span className="bld__baseName">{name}</span>
      {note ? <span className="bld__baseNote">{note}</span> : null}
    </button>
  );
}

export default function DonutBuilder() {
  const [s, dispatch] = useReducer(reducer, initial);
  const reduced = useReducedMotion();
  const fileRef = useRef(null);
  const [cheer, setCheer] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);

  const shapeItems = useMemo(() => buildShapeItems(BASES), []);

  const base     = byId(BASES, s.baseId);
  const icing    = byId(ICINGS, s.icingId);
  const filling  = byId(FILLINGS, s.fillingId);
  const sprinkle = byId(SPRINKLES, s.sprinkleId);

  const canFill   = RULES.takesFilling(s.baseId);
  const canTop    = RULES.takesSprinkles(s.icingId);
  const canPrint  = RULES.takesPrint(s.baseId);
  const asksColour = s.sprinkleId === "whip-color";

  /* Steps reveal one at a time. This is the order and membership; a step
     that doesn't apply to the current shape/icing is left out entirely
     rather than shown greyed out, so nothing extra is on screen. */
  const visibleSteps = useMemo(() => {
    const list = [{ id: "base" }, { id: "icing" }];
    if (canFill) list.push({ id: "filling" });
    if (canTop) list.push({ id: "sprinkle" });
    if (canPrint) list.push({ id: "print" });
    return list.map((st, i) => ({ ...st, number: i + 1 }));
  }, [canFill, canTop, canPrint]);

  /* Index into visibleSteps that's currently open; visibleSteps.length means
     every step is answered and the summary/footer is showing. Clamp when a
     base/icing change shortens the list out from under the current index. */
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    setStepIndex((i) => Math.min(i, visibleSteps.length));
  }, [visibleSteps.length]);

  const indexOf = (id) => visibleSteps.findIndex((st) => st.id === id);
  const advanceFrom = (id) => setStepIndex(indexOf(id) + 1);

  /* The stack, bottom up. A filling is a whole dough, so it stands in for the
     plain base; icing and sprinkles are cut to their own shape and sit over it. */
  const layers = useMemo(() => {
    const ground = fillingArt(base, filling) || baseArt(base);
    return [
      { key: "ground", src: ground, z: 10 },
      { key: "icing", src: icingArt(base, icing), z: 20 },
      { key: "print", src: s.print ? "print" : null, z: 22 },
      { key: "top",   src: toppingArt(base, sprinkle), z: 30 }
    ].filter((l) => l.src);
  }, [base, icing, filling, sprinkle, s.print]);

  const line = describe({ base, icing, filling, sprinkle, printOn: !!s.print });

  const surprise = useCallback(() => {
    const b = BASES[Math.floor(Math.random() * BASES.length)];
    const ice = ICINGS.filter((i) => !i.bare)[Math.floor(Math.random() * (ICINGS.length - 1))];
    const tops = SPRINKLES.filter((p) => !p.bare && RULES.sprinkleAllowed(b.id, p.id));
    const fills = FILLINGS.filter((f) => !f.bare);
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
    setStepIndex(visibleSteps.length);
  }, [visibleSteps.length]);

  /* A small cheer when the build is complete enough to be worth ordering.
     Tied to popSeq, not every change — base and icing get their own quieter
     transitions (a smooth resize and an iris-peel) instead of the full pop. */
  const done = !icing.bare && (!canFill || !filling.bare);
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

  const valueFor = (id) => {
    if (id === "base") return base.name;
    if (id === "icing") return icing.bare ? "No icing" : icing.name;
    if (id === "filling") return filling.bare ? "No filling" : filling.name;
    if (id === "sprinkle") return sprinkle.bare ? "No sprinkles" : sprinkle.name;
    if (id === "print") return s.print ? s.print.name : "Skipped";
    return "";
  };

  const stepTitle = { base: "The shape", icing: "The icing", filling: "The filling", sprinkle: "The sprinkles", print: "Print your own" };
  const shortTitle = { base: "Shape", icing: "Icing", filling: "Filling", sprinkle: "Sprinkles", print: "Print" };
  const openGroupItem = shapeItems.find((item) => item.type === "group" && item.key === openGroup);

  return (
    <section className="bld" id="build-your-own">
      <div className="bld__in">
        <div className="bld__grid">
          {/* ---------------- stage ---------------- */}
          <div className="bld__stageWrap">
            <div className="bld__stage" data-family={base.family}>
              <button
                type="button"
                className="bld__cornerBtn bld__cornerBtn--left"
                onClick={surprise}
                aria-label="Surprise me"
              >
                <Dices size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="bld__cornerBtn bld__cornerBtn--right"
                aria-label="Start over"
                onClick={() => {
                  dispatch({ type: "reset" });
                  setStepIndex(0);
                  setOpenGroup(null);
                }}
              >
                <Repeat size={18} aria-hidden="true" />
              </button>

              <div
                className={`bld__art${cheer === s.popSeq && !reduced ? " is-pop" : ""}`}
                key={s.popSeq}
                style={{ "--baseScale": base.scale ?? 1 }}
              >
                {layers.map((l) => {
                  if (l.key === "print") {
                    return (
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
                    );
                  }
                  if (l.key === "top") {
                    /* Inlined rather than masked, so each mark gets its own
                       colour (Rainbow is five, not one) and its own delay —
                       see Sprinkles.jsx. */
                    return (
                      <span key="top" className="bld__layer bld__topping" style={{ zIndex: l.z }}>
                        <Sprinkles
                          src={l.src}
                          colors={sprinkle.colors}
                          animate={!reduced}
                          seq={`${s.baseId}-${s.sprinkleId}-${s.seq}`}
                        />
                      </span>
                    );
                  }
                  return (
                    <img
                      key={l.key === "icing" ? `icing-${s.icingId}` : l.key}
                      className={`bld__layer${l.key === "icing" ? " bld__icing" : ""}`}
                      style={{ zIndex: l.z }}
                      src={l.src}
                      alt=""
                      draggable="false"
                    />
                  );
                })}
              </div>
            </div>

            <p className="bld__read">{line}</p>
          </div>

          {/* ---------------- steps ---------------- */}
          <div className="bld__steps">
            {stepIndex > 0 ? (
              <div className="bld__doneRow">
                {visibleSteps.map((st, i) =>
                  i < stepIndex ? (
                    <button
                      key={st.id}
                      type="button"
                      className="bld__doneChip"
                      onClick={() => setStepIndex(i)}
                    >
                      <span className="bld__doneChipLabel">{shortTitle[st.id]}</span>
                      <span className="bld__doneChipVal">{valueFor(st.id)}</span>
                    </button>
                  ) : null
                )}
              </div>
            ) : null}

            {visibleSteps.map((st, i) => {
              if (i !== stepIndex) return null;

              /* 1 · base — grouped shapes (round, cookie, boston, cupcakes) collapse into
                 one major thumbnail; tapping it opens a sizes row instead of
                 picking a base directly. */
              if (st.id === "base") {
                return (
                  <section className="bld__step" key={st.id}>
                    <h3 className="bld__stepH"><i>{st.number}</i> {stepTitle.base}</h3>
                    <p className="bld__stepNote">
                      {openGroupItem ? `Pick a size for ${openGroupItem.name}.` : STEP_NOTES.base}
                    </p>
                    <div className={`bld__row bld__row--bases${openGroupItem ? " bld__row--sizesOpen" : ""}`}>
                      {openGroupItem ? (
                        <>
                          <button
                            type="button"
                            className="bld__base bld__backBtn"
                            onClick={() => setOpenGroup(null)}
                          >
                            <ArrowLeft size={20} aria-hidden="true" />
                            <span className="bld__baseName">Back</span>
                          </button>
                          {openGroupItem.members.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className={`bld__base${m.id === s.baseId ? " is-on" : ""}`}
                              aria-pressed={m.id === s.baseId}
                              onClick={() => {
                                dispatch({ type: "base", id: m.id });
                                setOpenGroup(null);
                                advanceFrom("base");
                              }}
                            >
                              <span className="bld__baseArt" style={{ backgroundImage: `url(${baseArt(m)})` }} />
                              <span className="bld__baseName">{openGroupItem.sizeNames[m.id]}</span>
                            </button>
                          ))}
                        </>
                      ) : (
                        shapeItems.map((item) => {
                          if (item.type === "single") {
                            const b = item.base;
                            return (
                              <button
                                key={b.id}
                                {...chipProps(b.id === s.baseId, false)}
                                className={`bld__base${b.id === s.baseId ? " is-on" : ""}`}
                                data-family={b.family}
                                aria-pressed={b.id === s.baseId}
                                onClick={() => {
                                  dispatch({ type: "base", id: b.id });
                                  advanceFrom("base");
                                }}
                              >
                                <span className="bld__baseArt" style={{ backgroundImage: `url(${baseArt(b)})` }} />
                                <span className="bld__baseName">{b.name}</span>
                                <span className="bld__baseNote">{b.note}</span>
                              </button>
                            );
                          }

                          const active = item.members.find((m) => m.id === s.baseId);
                          return (
                            <button
                              key={item.key}
                              type="button"
                              className={`bld__base${active ? " is-on" : ""}`}
                              aria-pressed={!!active}
                              aria-expanded={false}
                              onClick={() => setOpenGroup(item.key)}
                            >
                              <span className="bld__baseArt" style={{ backgroundImage: `url(${baseArt(active || item.members[0])})` }} />
                              <span className="bld__baseName">{item.name}</span>
                              <span className="bld__baseNote">
                                {active ? `Selected: ${item.sizeNames[active.id]}` : item.note}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              }

              /* 2 · icing */
              if (st.id === "icing") {
                return (
                  <section className="bld__step" key={st.id}>
                    <h3 className="bld__stepH"><i>{st.number}</i> {stepTitle.icing}</h3>
                    <p className="bld__stepNote">{STEP_NOTES.icing}</p>
                    <div className="bld__row bld__row--bases">
                      {ICINGS.map((ic) => {
                        const art = icingArt(base, ic);
                        return (
                          <OptionCard
                            key={ic.id}
                            active={ic.id === s.icingId}
                            layers={[
                              { key: "ground", src: baseArt(base) },
                              ...(art ? [{ key: "icing", src: art }] : [])
                            ]}
                            mark={ic.bare ? <Ban size={18} aria-hidden="true" /> : null}
                            name={ic.name.replace("Vanilla · ", "")}
                            note={ic.bare ? "Just the dough." : ic.key.startsWith("vanilla") ? "Vanilla" : "Glaze"}
                            onClick={() => {
                              dispatch({ type: "icing", id: ic.id });
                              advanceFrom("icing");
                            }}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              }

              /* 3 · filling — only reachable when the shape has an inside */
              if (st.id === "filling") {
                return (
                  <section className="bld__step" key={st.id}>
                    <h3 className="bld__stepH"><i>{st.number}</i> {stepTitle.filling}</h3>
                    <p className="bld__stepNote">{STEP_NOTES.filling}</p>
                    <div className="bld__row bld__row--bases">
                      {FILLINGS.map((f) => {
                        const ground = fillingArt(base, f) || baseArt(base);
                        const ice = icingArt(base, icing);
                        return (
                          <OptionCard
                            key={f.id}
                            active={f.id === s.fillingId}
                            layers={[
                              { key: "ground", src: ground },
                              ...(ice ? [{ key: "icing", src: ice }] : [])
                            ]}
                            mark={f.bare ? <Ban size={18} aria-hidden="true" /> : null}
                            name={f.name.replace(" · Nut Free", "")}
                            note={f.bare ? "Nothing inside." : f.id === "nutella" ? "Nut free" : null}
                            onClick={() => {
                              dispatch({ type: "filling", id: f.id });
                              advanceFrom("filling");
                            }}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              }

              /* 4 · sprinkles — only reachable once there's icing to hold them */
              if (st.id === "sprinkle") {
                return (
                  <section className="bld__step" key={st.id}>
                    <h3 className="bld__stepH"><i>{st.number}</i> {stepTitle.sprinkle}</h3>
                    <p className="bld__stepNote">{STEP_NOTES.sprinkle}</p>
                    <div className="bld__row bld__row--bases bld__row--tops">
                      {SPRINKLES.map((p) => {
                        const ok = RULES.sprinkleAllowed(s.baseId, p.id);
                        const why = RULES.sprinkleReason(s.baseId, p.id, s.icingId);
                        const top = toppingArt(base, p);
                        const ice = icingArt(base, icing);
                        return (
                          <OptionCard
                            key={p.id}
                            active={p.id === s.sprinkleId}
                            disabled={!ok}
                            title={why}
                            layers={[
                              { key: "ground", src: fillingArt(base, filling) || baseArt(base) },
                              ...(ice ? [{ key: "icing", src: ice }] : []),
                              ...(top ? [{ key: "top", src: top, mask: true, colors: p.colors }] : [])
                            ]}
                            mark={p.bare ? <Ban size={18} aria-hidden="true" /> : null}
                            name={p.name.replace(" Sprinkles", "")}
                            note={!ok && why ? why : p.parve ? "Parve" : null}
                            onClick={() => {
                              dispatch({ type: "sprinkle", id: p.id });
                              if (p.id === "whip-color") return; /* wait for the colour note below */
                              advanceFrom("sprinkle");
                            }}
                          />
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
                        <button
                          type="button"
                          className="bld__plain"
                          style={{ marginTop: 12 }}
                          onClick={() => advanceFrom("sprinkle")}
                        >
                          Next
                        </button>
                      </label>
                    ) : null}
                  </section>
                );
              }

              /* 5 · print — round donut only */
              if (st.id === "print") {
                return (
                  <section className="bld__step" key={st.id}>
                    <h3 className="bld__stepH"><i>{st.number}</i> {stepTitle.print}</h3>
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
                          reader.onload = () => {
                            dispatch({ type: "print", file: { name: f.name, url: reader.result } });
                            advanceFrom("print");
                          };
                          reader.readAsDataURL(f);
                        }}
                      />
                      <button className="bld__drop" type="button" onClick={() => fileRef.current?.click()}>
                        {s.print ? (
                          <span
                            className="bld__dropDisc"
                            style={{ backgroundImage: `url(${s.print.url})`, backgroundSize: "cover", border: "none" }}
                          />
                        ) : (
                          <span className="bld__dropIcon" aria-hidden="true">
                            <Upload size={22} strokeWidth={2.2} />
                          </span>
                        )}
                        <span>
                          {s.print ? s.print.name : "Choose your artwork"}
                          <em>{s.print ? "Tap to swap it" : 'Square or round, 3" at 300dpi'}</em>
                        </span>
                      </button>
                      <button className="bld__plain" type="button" onClick={() => advanceFrom("print")}>
                        Skip this step
                      </button>
                    </div>
                  </section>
                );
              }

              return null;
            })}

            {stepIndex >= visibleSteps.length ? (
              <div className="bld__foot">
                <p className="bld__summary">{line}</p>
                <div className="bld__acts">
                  <Wedge label="Add to the Box" family="dare" />
                  <Wedge label="Email the Bakery" href="mailto:orders@amazingdonuts.com" family="sky" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
