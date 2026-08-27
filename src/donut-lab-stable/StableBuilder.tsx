import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { ArrowLeft, ChevronRight, Dices, RefreshCw, Upload } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { isPrintedDozenLab } from '../lib/lab-href';
import { useShop } from '../lib/shop';
import SprinkleLayer from './SprinkleLayer';
import {
  BASES, ICINGS, FILLINGS, SPRINKLES, RULES,
  STEP_LABEL, STEP_TITLE,
  baseArt, buildShapeItems, byId, cssUrl, describe, itemForBase,
  shortName, stack, stepsFor, toppingArt,
  type Sprinkle, type StepId,
  printSpot
} from './builder-data';
import './stable-builder.css';
import './claw-sequence.css';

/* v2: the stored build is keyed by version so that changing the defaults
   actually changes what people see. Anyone carrying a v1 build would otherwise
   have kept opening the lab on whatever they last picked, which is exactly the
   reason pink and rainbow did not look like the defaults. */
/**
 * What "how many of these?" offers. A half dozen and a dozen are how the
 * bakery already sells donuts, so those are the two that matter; one is the
 * default and stays on the row so the choice reads as a choice.
 */
const QUANTITIES: { label: string; count: number }[] = [
  { label: 'Just one', count: 1 },
  { label: 'Half dozen · 6', count: 6 },
  { label: 'Dozen · 12', count: 12 }
];

const STORE_KEY = 'ad-builder-v2';

/* --- State ---------------------------------------------------------------- */

type Print = { name: string; url: string };

type State = {
  baseId: string;
  icingId: string;
  fillingId: string;
  sprinkleIds: string[];
  /** Session-only: an uploaded artwork is never persisted. */
  print: Print | null;
  /** Current step index. Clamped on read, because the list can shrink. */
  i: number;
  /** The box-and-ribbon sequence has played. */
  added: boolean;
  /**
   * How many of this donut they want. One question, asked after the build, and
   * it means N copies of the configuration on screen — not N different donuts.
   *
   * This replaced a build-a-box counter that tracked "3 of 6 built" across a
   * run of individually-customised donuts. It was more machinery than the
   * choice deserved: wanting six of the thing you just made is the common case,
   * and wanting six *different* ones is served by resetting the builder.
   */
  qty: number;
};

const INITIAL: State = {
  baseId: 'round',
  icingId: 'pink',
  fillingId: 'none',
  sprinkleIds: ['rainbow'],
  print: null,
  i: 0,
  added: false,
  qty: 1
};

/**
 * The last build, read straight into the reducer's initial state.
 *
 * This has to be synchronous rather than a restore-on-mount effect: the effect
 * that persists the build also runs on mount, and with defaults still in state
 * it would overwrite the stored build before a restore dispatch could land.
 *
 * `print` and `added` are deliberately not persisted — a data-URL artwork
 * would blow the storage quota, and reopening into an already-boxed donut
 * would be a dead end. Step index always restarts at 0.
 */
function hydrate(): State {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return INITIAL;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.baseId !== 'string') return INITIAL;
    // Ids run through byId at read time, so an option retired from the menu
    // since the last visit falls back to the first of its list.
    return {
      ...INITIAL,
      baseId: saved.baseId,
      icingId: saved.icingId === 'red-glaze' ? 'red' : (saved.icingId ?? INITIAL.icingId),
      fillingId: saved.fillingId ?? INITIAL.fillingId,
      sprinkleIds: Array.isArray(saved.sprinkleIds)
        ? saved.sprinkleIds
        : [saved.sprinkleId ?? INITIAL.sprinkleIds[0]]
    };
  } catch {
    /* Private mode, or a shape we no longer understand. Start fresh. */
    return INITIAL;
  }
}

type Action =
  | { type: 'base' | 'icing' | 'filling' | 'sprinkle'; id: string }
  | { type: 'print'; print: Print | null }
  | { type: 'goto'; i: number }
  | { type: 'surprise'; next: Partial<State> }
  | { type: 'reset' }
  /** The answer to "how many of these?", asked after the build. */
  | { type: 'qty'; count: number }
  | { type: 'add' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'base': {
      /* A new shape can invalidate what was already chosen. Clear it rather
         than send an impossible order to the counter — the rules decide, not
         this switch. */
      return {
        ...state,
        baseId: action.id,
        fillingId: RULES.takesFilling(action.id) ? state.fillingId : 'none',
        print: RULES.takesPrint(action.id) ? state.print : null,
        added: false, qty: 1
      };
    }
    case 'icing':
      // No icing means nothing to hold a sprinkle on.
      return {
        ...state,
        icingId: action.id,
        sprinkleIds: RULES.takesSprinkles(action.id) ? state.sprinkleIds : ['none'],
        added: false, qty: 1
      };
    case 'filling':
      return { ...state, fillingId: action.id, added: false, qty: 1 };
    case 'sprinkle': {
      if (action.id === 'none') return { ...state, sprinkleIds: ['none'], added: false, qty: 1 };
      const current = state.sprinkleIds.filter((id) => id !== 'none');
      const sprinkleIds = current.includes(action.id)
        ? current.filter((id) => id !== action.id)
        : [...current, action.id];
      return { ...state, sprinkleIds: sprinkleIds.length ? sprinkleIds : ['none'], added: false, qty: 1 };
    }
    case 'print':
      return { ...state, print: action.print, added: false, qty: 1 };
    case 'goto':
      return { ...state, i: Math.max(0, action.i), added: false, qty: 1 };
    case 'surprise':
      return { ...state, ...action.next, print: null, added: false, qty: 1 };
    case 'reset':
      return { ...INITIAL };
    case 'add':
      return { ...state, added: true };
    case 'qty':
      return { ...state, qty: action.count };
    default:
      return state;
  }
}

/* --- Shared pieces -------------------------------------------------------- */

/* Clips against the one <SquircleDefs /> mounted at the page root. */
const SQUIRCLE: CSSProperties = { clipPath: 'url(#squircle-clip)' };

/**
 * The option panel's fixed height, and the two-line label box that makes it
 * fixed.
 *
 * Every step used to size its own panel: an icing rail with one-line labels
 * came out shorter than a shape rail with two, and the print step's upload row
 * shorter still, so advancing a step resized the panel and the stage above it
 * jumped to compensate. Both numbers are now constants, so the panel is the
 * same height on every step and nothing above it moves.
 *
 * 7 top pad + 82 preview + 5 gap + 32 label + 10 bottom pad = 136, plus the
 * rail's own 14px bottom padding.
 */
const LABEL_H = 32;
const PANEL_H = 150;
const PRINTED_DOZEN = PRODUCTS.find((product) => product.id === 'twelve-custom-printed-donuts');

/**
 * Forward: the old panel leaves to the left, the new one arrives from the
 * right. Backward is the same movement reversed, so the Back button reads as
 * going back rather than as another step forward.
 */
const PANEL_VARIANTS: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 0, pointerEvents: 'none' }),
  center: { x: '0%', opacity: 1, pointerEvents: 'auto' },
  /* pointerEvents matters as much as the movement: the two panels overlap for
     340ms, and without this the outgoing one still takes taps on its way out —
     a quick double-tap on Next would land the second tap on the step that had
     just been left. */
  exit: (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 0, pointerEvents: 'none' })
};

/** One absolutely-positioned art layer, sized to fit without cropping. */
function ArtLayer({ img }: { img: string }) {
  return (
    <span
      style={{
        position: 'absolute',
        inset: 0,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundImage: img
      }}
    />
  );
}

/**
 * The "add to the box" finale: a claw machine takes the finished donut away.
 *
 * Ported from `claw_sequence_export/` — one 4300ms CSS timeline, no JS driving
 * frames. It replaces the four-flap box fold that used to close over the
 * product. The keyframes and the geometry live in `claw-sequence.css`, which
 * carries the handoff's three structural rules; the only one this file has to
 * honour is the first, and it is a markup rule:
 *
 *   The rig must be a SIBLING of the clipped stage, not a child of it.
 *
 * The stage clips to the squircle so art cannot escape. The claw has to enter
 * from outside that square and carry the box back out through it, so it lives
 * on an unclipped overlay over the same box. Nesting it inside the stage would
 * clip the entrance and the exit and there would be no sequence left.
 *
 * There is no restart logic because none is needed: `added` goes false on
 * reset, which unmounts both halves, and mounting is what starts a CSS
 * animation.
 */

/**
 * The carton on the stage, in two independent pieces on the same rect.
 *
 * The bottom box rises on its own; the lid is a sibling rather than a child, so
 * it drops in from above without inheriting that rise. As a child, its drop was
 * multiplied by its parent's rise and the two beats read as one movement.
 */
function ClawBox() {
  return (
    <>
      <div className="claw-box" data-claw-box aria-hidden="true">
        <span className="claw-inside" />
        <span className="claw-body" />
      </div>
      <div className="claw-box" data-claw-lid aria-hidden="true">
        <span className="claw-lid" />
      </div>
    </>
  );
}

/**
 * The rig: feed line, carriage, cable, head, arms, and the box it carries off.
 *
 * `position: fixed`, which is what lets it come from the navbar. It lives
 * inside `.sb-stable` and the Lab page's `main`, both `overflow: hidden` to
 * guarantee the builder never scrolls - an absolute rig gets cropped by those
 * the moment it reaches above the stage. Fixed escapes them, because neither
 * ancestor has a transform or filter making itself a containing block.
 *
 * The cost is that fixed no longer inherits the stage's box, so the rect is
 * measured from the stage and handed in. Every percentage inside then resolves
 * against the same square as before. One measurement per play, not per frame:
 * the sequence itself stays pure CSS.
 */
function ClawRig({ box }: { box: { l: number; t: number; w: number; h: number } }) {
  return (
    <div
      className="claw-rig"
      data-claw-rig
      aria-hidden="true"
      style={{ left: box.l, top: box.t, width: box.w, height: box.h }}
    >
      {/* Runs off the top of the rig to the top of the window, so the cable
          comes down out of the navbar rather than starting in mid-air. */}
      <span className="claw-feed" />
      <span className="claw-carriage" />
      <span className="claw-badge" />
      <span className="claw-cable" />
      <div className="claw-head">
        {/* Child of the head, so the lift and the exit come for free. */}
        <div className="claw-box claw-carried">
          <span className="claw-body" />
          <span className="claw-lid" />
        </div>
        {/* One SVG for both arms, hinged at the ends of the head bar. The
            transform-origin IS the hinge, so a rotate is the whole grip. */}
        <svg viewBox="-16 0 132 64" preserveAspectRatio="none" aria-hidden="true">
          <g className="claw-armL" style={{ transformOrigin: '28px 18px' }}>
            <path
              d="M28 18 L 12 35 L 16 58"
              fill="none"
              stroke="var(--navy)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
            <circle cx="12" cy="35" r="4.4" fill="var(--cream)" stroke="var(--navy)" strokeWidth="3.2" />
          </g>
          <g className="claw-armR" style={{ transformOrigin: '72px 18px' }}>
            <path
              d="M72 18 L 88 35 L 84 58"
              fill="none"
              stroke="var(--navy)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
            <circle cx="88" cy="35" r="4.4" fill="var(--cream)" stroke="var(--navy)" strokeWidth="3.2" />
          </g>
          <rect x="20" y="0" width="60" height="24" rx="6" fill="var(--navy)" />
          <circle cx="28" cy="18" r="4.6" fill="var(--cream)" stroke="var(--navy)" strokeWidth="3.2" />
          <circle cx="72" cy="18" r="4.6" fill="var(--cream)" stroke="var(--navy)" strokeWidth="3.2" />
        </svg>
      </div>
    </div>
  );
}

type Tile = {
  id: string;
  name: string;
  active: boolean;
  layers: { img: string }[];
  /** Palette dots, for the sprinkle step. */
  dots: string[];
  /** Sprinkle step only: paint the real recoloured mask on the preview. */
  topping?: { src: string | null; sprinkle: Sprinkle };
  /** Set when a rule blocks this option; shown as the tile's tooltip. */
  reason?: string | null;
  onClick: () => void;
};

/* --- The builder ---------------------------------------------------------- */

export default function StableBuilder({ autoAdvance = false }: { autoAdvance?: boolean }) {
  const [s, dispatch] = useReducer(reducer, undefined, hydrate);
  const { add } = useShop();
  const printOrder = isPrintedDozenLab();
  const railRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  /* 0–1 while the file is being read, null when idle. Transient UI, so it is
     local state rather than part of the build the reducer owns. */
  const [readPct, setReadPct] = useState<number | null>(null);
  /* The stage's rect, for the fixed-position claw rig. Held only while the
     finale plays. */
  const stageBoxRef = useRef<HTMLDivElement | null>(null);
  const [rigBox, setRigBox] = useState<{ l: number; t: number; w: number; h: number } | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!printOrder) return;
    dispatch({
      type: 'surprise',
      next: { baseId: 'round', icingId: 'pink', fillingId: 'none', sprinkleIds: ['rainbow'], i: 4 }
    });
  }, [printOrder]);

  const base = byId(BASES, s.baseId);
  const icing = byId(ICINGS, s.icingId);
  const filling = byId(FILLINGS, s.fillingId);
  const selectedSprinkles = s.sprinkleIds.map((id) => byId(SPRINKLES, id));
  const sprinkle: Sprinkle = selectedSprinkles.some((item) => item.bare)
    ? byId(SPRINKLES, 'none')
    : {
        id: selectedSprinkles.map((item) => item.id).join('-'),
        name: selectedSprinkles.map((item) => item.name).join(', '),
        colors: selectedSprinkles.flatMap((item) => item.colors)
      };

  const shapeItems = useMemo(() => buildShapeItems(BASES), []);
  const activeItem = itemForBase(s.baseId);

  const steps = useMemo(() => stepsFor(base, icing), [base, icing]);
  // The list can shrink under the cursor — a bare icing drops the sprinkle
  // step, an ungrouped shape drops the size step — so the index is clamped
  // here rather than at every write.
  const i = Math.min(s.i, steps.length - 1);
  const step: StepId = steps[i];
  const last = i === steps.length - 1;

  /* Which way the panel should travel. Read from the clamped index, not from
     the dispatched one: a shape change that drops a step moves the cursor
     without anybody pressing Next, and the slide should follow where the panel
     actually went. */
  const prevIndex = useRef(i);
  const dir = i >= prevIndex.current ? 1 : -1;
  useEffect(() => {
    prevIndex.current = i;
  }, [i]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          baseId: s.baseId,
          icingId: s.icingId,
          fillingId: s.fillingId,
          sprinkleIds: s.sprinkleIds
        })
      );
    } catch {
      /* Persistence is a nicety, never a requirement. */
    }
  }, [s.baseId, s.icingId, s.fillingId, s.sprinkleIds]);

  /* The claw rig is fixed, so it is positioned against the viewport and has to
     be told where the stage is. Re-measured on anything that could move the
     stage under it: the builder cannot scroll, but the page around it can. */
  useEffect(() => {
    if (!s.added) {
      setRigBox(null);
      return;
    }
    const measure = () => {
      const r = stageBoxRef.current?.getBoundingClientRect();
      if (r) setRigBox({ l: r.left, t: r.top, w: r.width, h: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [s.added]);

  /* Reveal the active pill by nudging scrollLeft, never scrollIntoView — that
     would scroll the page too, and this layout is not allowed to move. */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const pill = rail.children[i] as HTMLElement | undefined;
    if (!pill) return;
    const pad = 14;
    const left = pill.offsetLeft - pad;
    const right = pill.offsetLeft + pill.offsetWidth + pad;
    if (left < rail.scrollLeft) rail.scrollLeft = left;
    else if (right > rail.scrollLeft + rail.clientWidth) rail.scrollLeft = right - rail.clientWidth;
  }, [i, steps.length]);

  const pick = (kind: 'base' | 'icing' | 'filling' | 'sprinkle', id: string) => {
    dispatch({ type: kind, id });
    if (autoAdvance && kind !== 'sprinkle') dispatch({ type: 'goto', i: i + 1 });
  };

  const surprise = () => {
    const pickOne = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
    const b = pickOne(BASES);
    dispatch({
      type: 'surprise',
      next: {
        baseId: b.id,
        icingId: pickOne(ICINGS.filter((x) => !x.bare)).id,
        sprinkleIds: [pickOne(SPRINKLES.filter((x) => !x.bare)).id],
        fillingId: RULES.takesFilling(b.id) ? pickOne(FILLINGS.filter((x) => !x.bare)).id : 'none'
      }
    });
  };

  const onNext = () => {
    if (s.added) {
      dispatch({ type: 'reset' });
      return;
    }
    if (last && printOrder && !s.print) fileRef.current?.click();
    else if (last) {
      if (printOrder && PRINTED_DOZEN) add(PRINTED_DOZEN);
      dispatch({ type: 'add' });
    }
    else dispatch({ type: 'goto', i: i + 1 });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    /* Real progress from the read, not a fake sweep. A phone photo is a few MB
       of base64 and does take a moment; a small PNG will flash straight to
       full, which is the honest answer for a small PNG. */
    setReadPct(0);
    reader.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) setReadPct(ev.loaded / ev.total);
    };
    reader.onload = () => {
      setReadPct(null);
      dispatch({ type: 'print', print: { name: file.name, url: String(reader.result) } });
    };
    reader.onerror = () => setReadPct(null);
    reader.readAsDataURL(file);
    // Let the same file be picked again after a reset.
    e.target.value = '';
  };

  /* --- Derived view data -------------------------------------------------- */

  const stageLayers = stack(base, icing, filling);
  const topSrc = toppingArt(base, sprinkle);

  const stepValue = (sid: StepId) => {
    if (sid === 'base') return activeItem.name;
    if (sid === 'size') {
      return activeItem.type === 'group' ? activeItem.sizeNames[s.baseId] : base.name;
    }
    if (sid === 'icing') return shortName(icing.name);
    if (sid === 'filling') return filling.bare ? 'None' : shortName(filling.name);
    if (sid === 'sprinkle') return sprinkle.bare ? 'None' : sprinkle.name;
    /* Not 'Skipped' — the rail pill is read before the step is reached, and
       calling it skipped announces the outcome of a choice nobody has made
       yet. It names the action instead, like every other pill names a value. */
    return s.print ? 'Added' : 'Upload';
  };

  const options: Tile[] = useMemo(() => {
    const noFill = FILLINGS[0];

    if (step === 'base') {
      /* Grouped shapes collapse to one tile, so the rail is not three
         near-identical cookies in a row. Picking a group selects its first
         member and the `size` step appears to choose between them. */
      return shapeItems.map((it) => ({
        id: it.key,
        name: it.name,
        active: it.members.some((m) => m.id === s.baseId),
        dots: [],
        reason: it.note,
        layers: stack(it.base, icing, noFill),
        onClick: () => pick('base', it.members.some((m) => m.id === s.baseId) ? s.baseId : it.base.id)
      }));
    }
    if (step === 'size') {
      return activeItem.members.map((m) => ({
        id: m.id,
        name: activeItem.type === 'group' ? activeItem.sizeNames[m.id] : m.name,
        active: m.id === s.baseId,
        dots: [],
        reason: m.note,
        layers: stack(m, icing, filling),
        onClick: () => pick('base', m.id)
      }));
    }
    if (step === 'icing') {
      return ICINGS.map((o) => ({
        id: o.id,
        name: shortName(o.name),
        active: o.id === s.icingId,
        dots: [],
        // The bare option previews the undressed shape, which says "no icing"
        // better than a word laid over the art could.
        layers: o.bare ? [{ img: cssUrl(baseArt(base)) }] : stack(base, o, filling),
        onClick: () => pick('icing', o.id)
      }));
    }
    if (step === 'filling') {
      return FILLINGS.map((o) => ({
        id: o.id,
        name: shortName(o.name),
        active: o.id === s.fillingId,
        dots: [],
        layers: stack(base, icing, o),
        onClick: () => pick('filling', o.id)
      }));
    }
    if (step === 'sprinkle') {
      return SPRINKLES.map((o) => ({
        id: o.id,
        name: o.name,
        active: s.sprinkleIds.includes(o.id),
        /* The tile now shows the actual sprinkles, recoloured, on the donut
           being built — and costs nothing to do so: the mask is one SVG file
           per shape, already fetched for the stage and cached in
           SprinkleLayer's module map, so ten tiles re-use one response. Only
           the marks are new, ~70 static shapes at the worst shape, with the
           drop animation off. The dots stay as the palette key: at this size
           the marks read as colour but not as a legible swatch. */
        dots: o.colors,
        topping: { src: toppingArt(base, o), sprinkle: o },
        // The rule that would block a sprinkle (no icing) removes this whole
        // step instead, so the reason never has to be shown here.
        reason: RULES.sprinkleReason(s.icingId),
        layers: stack(base, icing, filling),
        onClick: () => pick('sprinkle', o.id)
      }));
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, s.baseId, s.icingId, s.fillingId, s.sprinkleIds, i]);

  const nextLabel = s.added
    ? 'Build another'
    : last
      ? printOrder && !s.print ? 'Upload artwork' : 'Add to the box'
      : `Next · ${STEP_LABEL[steps[i + 1]]}`;

  /* --- Render ------------------------------------------------------------- */

  return (
    <div
      className="sb-stable"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 520,
        overflow: 'hidden',
        background: 'var(--cream)',
        color: 'var(--navy)',
        fontFamily: 'var(--font-body)'
      }}
    >
      {/* Control row. The site header above already carries the wordmark, so
          this band is just the eyebrow and the two shortcuts. */}
      <div
        style={{
          flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 10, padding: '8px 14px'
        }}
      >
{/* The eyebrow that used to sit here said 'Build your own', which the page
            title, the step titles and the whole interface already say. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="sb-press"
            onClick={surprise}
            aria-label="Surprise me"
            title="Surprise me"
            style={{
              flex: 'none', width: 44, height: 44, border: 0, borderRadius: 'var(--radius-pill)',
              background: 'var(--pink)', color: 'var(--navy)', display: 'grid',
              placeItems: 'center', cursor: 'pointer'
            }}
          >
            <Dices size={21} strokeWidth={2.1} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sb-press"
            onClick={() => dispatch({ type: 'reset' })}
            aria-label="Start over"
            title="Start over"
            style={{
              flex: 'none', width: 44, height: 44, border: 0, borderRadius: 'var(--radius-pill)',
              background: 'transparent', boxShadow: 'inset 0 0 0 2px var(--navy)',
              color: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer'
            }}
          >
            <RefreshCw size={19} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Stage. The only flexible band, so it absorbs any device height: the
          artwork shrinks and nothing else has to give. */}
      <div
        style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2px 14px 0'
        }}
      >
        {/* Wrapper: square, and deliberately NOT clipped. The claw rig hangs
            off it as a sibling of the stage so it can travel outside the frame.
            Everything the sequence positions is a % of this square. */}
        <div
          ref={stageBoxRef}
          className="sb-claw"
          style={{
            position: 'relative', width: '100%', maxWidth: 'min(100%, 520px)', aspectRatio: '1',
            maxHeight: '100%', minHeight: 0
          }}
        >
          <div
            style={{
              position: 'absolute', inset: 0,
              /* The sand squircle is the stage the product sits on. It was
                 briefly transparent — it read as a tile under the donut rather
                 than as the frame — but without it the stage has no edge at
                 all, so it is back. The clip lives here, on the stage, and not
                 on the wrapper above. */
              background: 'var(--sand)',
              display: 'grid', placeItems: 'center', overflow: 'hidden', ...SQUIRCLE
            }}
          >
          <div
            style={{
              position: 'absolute', inset: 0,
              transition: 'transform 420ms cubic-bezier(.3,1.2,.5,1)',
              // The shape's own scale, times a constant crop factor: the art
              // files carry padding the stage does not want. Animating this is
              // what makes switching between the three cookies grow or shrink
              // instead of cutting from one file to the next.
              transform: `scale(${base.scale * 1.2})`
            }}
          >
            <div
              /* The shrink into the carton's mouth is part of the claw
                 timeline, so the class owns it rather than an inline string. */
              className={s.added ? 'sb-claw-tuck' : undefined}
              style={{ position: 'absolute', inset: 0 }}
            >
              {stageLayers.map((l, n) => (
                <ArtLayer key={n} img={l.img} />
              ))}
              {s.print && (
                /* Placed per shape rather than dead centre: see `printSpot`.
                   It sits inside the scaled wrapper, so it grows and shrinks
                   with the art instead of floating over it. */
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: `${printSpot(base.id).top}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${printSpot(base.id).size}%`,
                    aspectRatio: '1',
                    borderRadius: '50%',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundImage: cssUrl(s.print.url),
                    boxShadow: '0 0 0 2px rgba(14,62,105,.35)'
                  }}
                />
              )}
              {/* Keyed on the palette so a new colour replays the drop. */}
              <SprinkleLayer key={`${topSrc}|${sprinkle.id}`} src={topSrc} sprinkle={sprinkle} />
            </div>
          </div>
            {/* Inside the clip: the carton that rises off the stage. */}
            {s.added && <ClawBox />}
          </div>

          {/* Outside the clip: the rig. See the note on ClawRig. */}
          {/* Waits for the measurement rather than rendering at 0,0 first. */}
          {s.added && rigBox && <ClawRig box={rigBox} />}
        </div>

        <div
          style={{
            flex: 'none', width: '100%', maxWidth: 'min(100%, 520px)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 8
          }}
        >
          {!s.added && (
            <span style={{ minWidth: 0, textAlign: 'center', fontSize: 13.5, lineHeight: 1.35, color: 'var(--text-body)' }}>
              {describe({ base, icing, filling, sprinkle, printOn: !!s.print })}
            </span>
          )}
          {/* 'In the box', and the kosher badges under it, are pulled for now.
              The fold itself is the confirmation. */}

          {/* --- how many of these? ------------------------------------------
              Asked after the build, not before it: before, the question wants a
              commitment from someone who has not yet seen what they can make.

              Hidden on a printed order. That path adds `twelve-custom-printed-
              donuts` to the cart, which is a dozen by definition, so offering
              "half dozen" there would be nonsense and passing 12 through would
              mean twelve dozen. */}
          {s.added && !printOrder && (
            <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
              <span
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)'
                }}
              >
                How many of these?
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {QUANTITIES.map((option) => {
                  const on = s.qty === option.count;
                  return (
                    <button
                      key={option.count}
                      type="button"
                      className="sb-press"
                      aria-pressed={on}
                      onClick={() => dispatch({ type: 'qty', count: option.count })}
                      style={{
                        minHeight: 40,
                        padding: '0 15px',
                        border: 0,
                        borderRadius: 'var(--radius-pill)',
                        /* The site's chip language: Bubblegum when chosen, a
                           hairline ring when not. */
                        background: on ? 'var(--pink)' : 'transparent',
                        boxShadow: on ? 'none' : 'inset 0 0 0 1.5px rgba(14,62,105,.24)',
                        color: 'var(--navy)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stage rail — one pill per step, tap to jump back to it. */}
      <div ref={railRef} className="sb-rail" style={{ flex: 'none', gap: 8, padding: '12px 14px 10px' }}>
        {steps.map((sid, n) => {
          const on = n === i;
          return (
            <button
              key={sid}
              type="button"
              className="sb-pill"
              onClick={() => dispatch({ type: 'goto', i: n })}
              aria-pressed={on}
              style={{
                flex: 'none', minHeight: 52, display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '6px 14px 6px 8px', border: 0, borderRadius: 'var(--radius-pill)',
                cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
                background: on ? 'var(--navy)' : 'var(--sand)',
                boxShadow: on ? 'none' : 'inset 0 0 0 1px rgba(14,62,105,.12)'
              }}
            >
              <span
                style={{
                  flex: 'none', width: 26, height: 26, borderRadius: 'var(--radius-pill)',
                  display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800,
                  background: on ? 'var(--orange)' : 'var(--cream)',
                  color: on ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                {n + 1}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
                    color: on ? 'var(--text-on-navy)' : 'var(--text-muted)'
                  }}
                >
                  {STEP_LABEL[sid]}
                </span>
                <span
                  style={{
                    fontSize: 13.5, fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap',
                    color: on ? 'var(--cream)' : 'var(--navy)'
                  }}
                >
                  {stepValue(sid)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Option sheet. Rounded at the top only — it reads as a drawer the
          stage sits in, and the action row belongs to it, not below it. */}
      <div style={{ flex: 'none', background: 'var(--sand)', borderRadius: '28px 28px 0 0', padding: '14px 0 0' }}>
        <div
          className="sb-head sb-measure"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '0 18px 2px'
          }}
        >
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1.05 }}>
            {STEP_TITLE[step]}
          </h2>
          {/* A chip, not loose type: on the baseline it sat low against a
              28px display line and read as a stray caption. Centred in a pill
              it reads as a counter belonging to the header row. */}
          <span
            style={{
              flex: 'none', display: 'inline-flex', alignItems: 'center', height: 26,
              padding: '0 11px', borderRadius: 'var(--radius-pill)',
              background: 'var(--cream)', boxShadow: 'inset 0 0 0 1px rgba(14,62,105,.12)',
              fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase', whiteSpace: 'nowrap', color: 'var(--text-muted)'
            }}
          >
            {`Stage ${i + 1} of ${steps.length}`}
          </span>
        </div>

        {/* The step note used to sit here — 'Twelve shapes. The rest of the
            choices follow from this one.' and its equivalents. Removed on every
            stage: the step title plus the rail says the same thing, and the
            line cost the stage a band of height on every screen. STEP_NOTES is
            still in builder-data.ts, unrendered, like the prices. */}

        {/* Option panel. Fixed height and one panel at a time, sliding: the
            step's options used to be swapped in place, which resized the band
            and shifted the stage above it on every Next. */}
        <div style={{ position: 'relative', height: PANEL_H, overflow: 'hidden' }}>
          <AnimatePresence initial={false} custom={dir} mode="sync">
            <motion.div
              key={step}
              custom={dir}
              variants={PANEL_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={
                shouldReduceMotion
                  ? { duration: 0.12 }
                  : { x: { duration: 0.34, ease: [0.32, 0.9, 0.28, 1] }, opacity: { duration: 0.22 } }
              }
              style={{ position: 'absolute', inset: 0 }}
            >
              {step === 'print' ? (
              <div className="sb-measure" style={{ padding: '0 18px 14px' }}>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                <button
                  type="button"
                  className="sb-press-row"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                    padding: 12, border: 0, borderRadius: 22, background: 'var(--cream)',
                    boxShadow: 'inset 0 0 0 2px rgba(14,62,105,.35)', cursor: 'pointer',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  {/* The circle is the upload target, the progress indicator and
                      the result preview, in that order: an upload arrow to begin,
                      the ring filling as the file is read, then the artwork itself
                      in the same 3" round the print will actually be. */}
                  <span
                    style={{
                      position: 'relative', flex: 'none', width: 64, height: 64,
                      borderRadius: '50%', background: 'var(--sand)',
                      display: 'grid', placeItems: 'center',
                      boxShadow: s.print ? 'none' : 'inset 0 0 0 2px rgba(14,62,105,.35)',
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      backgroundImage: s.print ? cssUrl(s.print.url) : 'none'
                    }}
                  >
                    {readPct === null && !s.print && (
                      <Upload size={24} strokeWidth={2.3} aria-hidden="true" style={{ color: 'var(--navy)' }} />
                    )}
                    {readPct !== null && (
                      /* The ring is the circle's own edge, drawn as an arc rather
                         than laid on top of it: the track is the same 2px inset
                         the idle state has, so nothing moves when reading starts.
                         -90deg puts zero at twelve o'clock. */
                      <svg
                        viewBox="0 0 64 64"
                        width="64"
                        height="64"
                        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
                        role="progressbar"
                        aria-label="Uploading artwork"
                        aria-valuenow={Math.round(readPct * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <circle cx="32" cy="32" r="31" fill="none" stroke="rgba(14,62,105,.18)" strokeWidth="2" />
                        <circle
                          cx="32"
                          cy="32"
                          r="31"
                          fill="none"
                          stroke="var(--orange)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          pathLength={1}
                          strokeDasharray={1}
                          strokeDashoffset={1 - readPct}
                          style={{ transition: 'stroke-dashoffset 120ms linear' }}
                        />
                      </svg>
                    )}
                    {readPct !== null && (
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--navy)' }}>
                        {Math.round(readPct * 100)}%
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 15.5, fontWeight: 800, color: 'var(--navy)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}
                    >
                      {readPct !== null ? 'Uploading…' : s.print ? s.print.name : 'Choose your artwork'}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {readPct !== null
                        ? 'Reading the file'
                        : s.print
                          ? 'Tap to swap it'
                          : 'Square or round, 3" at 300dpi'}
                    </span>
                  </span>
                </button>
              </div>
              ) : (
              <div className="sb-rail sb-options" style={{ gap: 10, padding: '0 18px 14px' }}>
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="sb-tile"
                    onClick={opt.onClick}
                    aria-pressed={opt.active}
                    title={opt.reason || undefined}
                    style={{
                      flex: 'none', width: 96, scrollSnapAlign: 'start', border: 0, borderRadius: 22,
                      background: 'var(--cream)', padding: '7px 7px 10px', display: 'flex',
                      flexDirection: 'column', gap: 5, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', textAlign: 'center',
                      boxShadow: opt.active ? 'inset 0 0 0 3px var(--navy)' : 'inset 0 0 0 1px rgba(14,62,105,.10)'
                    }}
                  >
                    {/* The preview shows this option on the donut being built,
                        not an abstract swatch. */}
                    <span
                      style={{
                        position: 'relative', aspectRatio: '1', background: 'var(--sand)',
                        display: 'grid', placeItems: 'center', overflow: 'hidden', ...SQUIRCLE
                      }}
                    >
                      {opt.layers.map((l, n) => (
                        <ArtLayer key={n} img={l.img} />
                      ))}
                      {opt.topping && (
                        <SprinkleLayer
                          src={opt.topping.src}
                          sprinkle={opt.topping.sprinkle}
                          animate={false}
                        />
                      )}
                      {opt.dots.length > 0 && (
                        <span
                          style={{
                            position: 'absolute', left: 0, right: 0, bottom: 6,
                            display: 'flex', justifyContent: 'center', gap: 4
                          }}
                        >
                          {opt.dots.map((c, n) => (
                            <span
                              key={n}
                              style={{
                                width: 9, height: 9, borderRadius: 'var(--radius-pill)',
                                boxShadow: 'inset 0 0 0 1px rgba(14,62,105,.30)', background: c
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </span>
                    {/* A fixed two-line box. 'Sofgania / Boston' wraps and
                        'Twist' does not, so without it the tiles in one rail
                        end up different heights and their bottoms go ragged. */}
                    <span
                      style={{
                        minHeight: LABEL_H, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 13, fontWeight: 700,
                        lineHeight: 1.2, color: 'var(--navy)'
                      }}
                    >
                      {opt.name}
                    </span>
                  </button>
                ))}
              </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action row. The bottom pad clears iOS home indicators and the
            Android URL bar — which is also why the band is sized in dvh. */}
        <div
          className="sb-measure"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, background: 'var(--sand)',
            padding: '0 14px calc(16px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {i > 0 && (
            <button
              type="button"
              className="sb-press-sm"
              onClick={() => dispatch({ type: 'goto', i: i - 1 })}
              aria-label="Previous stage"
              style={{
                flex: 'none', width: 56, height: 56, border: 0, borderRadius: 'var(--radius-pill)',
                background: 'transparent', boxShadow: 'inset 0 0 0 2px var(--navy)',
                color: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer'
              }}
            >
              <ArrowLeft size={22} strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className="sb-press-cta"
            onClick={onNext}
            style={{
              flex: 1, minWidth: 0, height: 58, border: 0, borderRadius: 'var(--radius-pill)',
              background: 'var(--orange)', color: '#ffffff', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 14, padding: '0 8px 0 24px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 18, textTransform: 'uppercase'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextLabel}
            </span>
            <span
              style={{
                flex: 'none', width: 42, height: 42, borderRadius: 'var(--radius-pill)',
                background: 'var(--navy)', display: 'grid', placeItems: 'center', color: '#ffffff'
              }}
            >
              {/* 'Build another' starts over rather than moving on, so it gets
                  the same icon as the Start over control. A chevron promised a
                  next step that does not exist. */}
              {s.added ? (
                <RefreshCw size={19} strokeWidth={2.6} aria-hidden="true" />
              ) : (
                <ChevronRight size={20} strokeWidth={2.6} aria-hidden="true" />
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
