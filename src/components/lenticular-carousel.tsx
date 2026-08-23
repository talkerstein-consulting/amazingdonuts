"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as THREE from "three";

import { cn } from "@/lib/utils";

export interface LenticularCarouselItem {
  /** Image shown on the resting face */
  src: string;
  /** Optional second image revealed by the flip, defaults to src */
  flipSrc?: string;
  /** Headline printed on the revealed face */
  title?: string;
  /** Small line set above the headline */
  meta?: string;
  /** Alt text, defaults to the title */
  alt?: string;
}

export interface LenticularCarouselProps {
  /** Slides rendered by the carousel */
  items?: LenticularCarouselItem[];
  /** Slide focused on mount */
  initialIndex?: number;
  /** Slide width in pixels */
  cardWidth?: number;
  /** Aspect ratio of each slide */
  aspectRatio?: string;
  /** Space between slides in pixels */
  gap?: number;
  /** Corner radius of the slides in pixels */
  borderRadius?: number;
  /** Number of lens ribs printed across a slide */
  strips?: number;
  /** How far the turn lags across the slide, raking the wipe */
  sweep?: number;
  /** Parallax the two faces pick up as the lens turns */
  refraction?: number;
  /** Shading and glint strength of the lens ribs */
  ridge?: number;
  /** Strength of the holographic foil on the revealed face */
  foil?: number;
  /** Number of foil shimmer bands across a slide */
  foilScale?: number;
  /** Darkening under the label from 0 to 1 */
  scrim?: number;
  /** Degrees the slide turns while flipped */
  tilt?: number;
  /** Fraction of the slide width the cursor sweeps to turn the lens fully */
  travel?: number;
  /** Distance in pixels the slide travels toward the viewer while flipped */
  lift?: number;
  /** Camera distance in pixels */
  perspective?: number;
  /** Scale applied to slides away from the focus */
  inactiveScale?: number;
  /** Brightness of slides away from the focus from 0 to 1 */
  inactiveDim?: number;
  /** Multiplier for every transition */
  speed?: number;
  /** What turns a slide over */
  trigger?: "hover" | "focus";
  /** Print the label on the revealed face */
  showLabels?: boolean;
  /** Label colour in hex */
  labelColor?: string;
  /** Show the previous and next buttons */
  showControls?: boolean;
  /** Show the segmented progress rail */
  showDots?: boolean;
  /** Wrap around at either end */
  loop?: boolean;
  /** Advance on a timer */
  autoplay?: boolean;
  /** Delay between automatic advances in milliseconds */
  autoplayDelay?: number;
  /** Allow dragging across the strip to navigate */
  enableDrag?: boolean;
  /** Allow arrow keys to navigate when focused */
  enableKeyboard?: boolean;
  /** Upper bound on device pixel ratio */
  dpr?: number;
  /** Hold the foil still */
  paused?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Fired whenever the focused slide changes */
  onIndexChange?: (index: number) => void;
}

const DEFAULT_ITEMS: LenticularCarouselItem[] = [
  {
    src: "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=80&w=800&auto=format&fit=crop",
    title: "Vanishing Point",
    meta: "Structure",
  },
  {
    src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop",
    title: "Glass and Gravity",
    meta: "Facade",
  },
  {
    src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=800&auto=format&fit=crop",
    title: "Cut From the Sky",
    meta: "Concrete",
  },
  {
    src: "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=80&w=800&auto=format&fit=crop",
    title: "Stacked in White",
    meta: "Volume",
  },
  {
    src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=800&auto=format&fit=crop",
    title: "The Long Curve",
    meta: "Motion",
  },
  {
    src: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=800&auto=format&fit=crop",
    title: "Quiet Lines",
    meta: "Grid",
  },
  {
    src: "https://images.unsplash.com/photo-1470075801209-17f9ec0cada6?q=80&w=800&auto=format&fit=crop",
    title: "Cobalt Facade",
    meta: "Surface",
  },
  {
    src: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=800&auto=format&fit=crop",
    title: "Concrete Chorus",
    meta: "Repetition",
  },
];

const LABEL_WIDTH = 512;
const FLICK_WEIGHT = 140;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

const settle = (value: number, count: number, wrap: boolean) => {
  if (count < 1) return 0;
  if (wrap) return ((value % count) + count) % count;
  return clamp(value, 0, count - 1);
};

const nearest = (delta: number, count: number) => {
  if (count < 2) return delta;
  const half = count / 2;
  return ((((delta + half) % count) + count) % count) - half;
};

const readRatio = (raw: string) => {
  const parts = raw.split("/");
  if (parts.length === 2) {
    const w = Number(parts[0]);
    const h = Number(parts[1]);
    if (w > 0 && h > 0) return w / h;
  }
  const flat = Number(raw);
  return flat > 0 ? flat : 0.75;
};

const cardVertex = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const cardFragment = `
precision highp float;

uniform sampler2D uRest;
uniform sampler2D uTurn;
uniform sampler2D uTag;
uniform vec2 uFitRest;
uniform vec2 uFitTurn;
uniform vec2 uSpan;
uniform float uFlip;
uniform float uRibs;
uniform float uRake;
uniform float uBend;
uniform float uRidge;
uniform float uFoil;
uniform float uFoilScale;
uniform float uVeil;
uniform float uTag0;
uniform float uTime;
uniform float uTurnAngle;
uniform float uEngage;
uniform float uDim;
uniform float uRadius;
uniform float uAlpha;

varying vec2 vUv;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(6.28318530718 * (t + vec3(0.0, 0.33, 0.67)));
}

vec2 frame(vec2 uv, vec2 fit, float slide) {
  return (uv - 0.5) * fit + 0.5 + vec2(slide, 0.0);
}

void main() {
  float lane = vUv.x * uRibs;
  float local = fract(lane);
  float span = fwidth(vUv.x) * uRibs;

  float front = uFlip * (1.0 + uRake) - uRake * (1.0 - vUv.x);
  float edge = clamp(front, 0.0, 1.0);
  float reach = max(span, 1e-4);
  float ramp = edge * (1.0 + reach) - reach * 0.5;
  float sel = clamp((ramp - local) / reach + 0.5, 0.0, 1.0);

  float rib = local * 2.0 - 1.0;
  float lensShift = rib * uBend * 0.006 * uEngage;
  float faceShift = (uFlip - 0.5) * uBend * 0.016 * uEngage;

  vec3 rest = texture2D(uRest, frame(vUv, uFitRest, lensShift + faceShift)).rgb;
  vec3 turn = texture2D(uTurn, frame(vUv, uFitTurn, -lensShift - faceShift)).rgb;

  float veil = (1.0 - smoothstep(0.0, 0.5, vUv.y)) * uVeil;
  turn = mix(turn, turn * 0.06, veil);

  float axis = vUv.x + vUv.y * 0.35;
  float travel = axis * 1.15 - uTurnAngle * 3.4;
  float band = pow(clamp(1.0 - abs(travel - 0.5) * 2.3, 0.0, 1.0), 1.7);
  float fine = axis * uFoilScale + uTime * 0.16;
  float shimmer = 0.5 + 0.5 * sin(fine * 6.28318530718);
  turn += spectrum(fine * 0.5 + travel * 0.5) * band * (0.4 + 0.6 * shimmer) * uFoil * 0.8;

  vec4 tag = texture2D(uTag, vUv);
  turn = mix(turn, tag.rgb, tag.a * uTag0);

  vec3 col = mix(rest, turn, sel);

  float crisp = clamp(1.0 - span * 2.5, 0.0, 1.0);
  float relief = uRidge * crisp * uEngage;
  vec3 nrm = normalize(vec3(rib * 0.85, 0.0, 1.0));
  vec3 lamp = normalize(vec3(0.32 + uTurnAngle * 1.6, 0.42, 1.0));
  float glint = pow(max(dot(nrm, lamp), 0.0), 18.0);
  col *= mix(1.0, 1.0 - 0.17 * rib * rib, relief);
  col += glint * relief * 0.11;

  col *= uDim;

  vec2 pos = (vUv - 0.5) * uSpan;
  vec2 ext = uSpan * 0.5;
  float rad = min(uRadius, min(ext.x, ext.y));
  vec2 corner = abs(pos) - (ext - rad);
  float dist =
    length(max(corner, 0.0)) + min(max(corner.x, corner.y), 0.0) - rad;
  float mask = clamp(0.5 - dist / max(fwidth(dist), 1e-4), 0.0, 1.0);

  vec3 lit = max(col, 0.0);
  vec3 curve = mix(
    lit * 12.92,
    1.055 * pow(lit, vec3(0.4166667)) - 0.055,
    step(vec3(0.0031308), lit)
  );

  gl_FragColor = vec4(clamp(curve, 0.0, 1.0), mask * uAlpha);
}
`;

const fold = (
  ctx: CanvasRenderingContext2D,
  text: string,
  limit: number,
  rows: number,
) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let run = "";

  for (const word of words) {
    const next = run ? `${run} ${word}` : word;
    if (ctx.measureText(next).width <= limit || !run) {
      run = next;
      continue;
    }
    lines.push(run);
    run = word;
    if (lines.length === rows) break;
  }

  if (lines.length < rows && run) lines.push(run);
  if (lines.length === rows && run && lines[rows - 1] !== run) {
    let tail = lines[rows - 1];
    while (tail.length > 1 && ctx.measureText(`${tail}…`).width > limit) {
      tail = tail.slice(0, -1);
    }
    lines[rows - 1] = `${tail}…`;
  }

  return lines;
};

const paintLabel = (
  title: string,
  meta: string,
  ratio: number,
  tint: string,
) => {
  const width = LABEL_WIDTH;
  const height = Math.max(96, Math.round(LABEL_WIDTH / ratio));
  const sheet = document.createElement("canvas");
  sheet.width = width;
  sheet.height = height;

  const ctx = sheet.getContext("2d");
  if (!ctx || !title) return sheet;

  const inset = Math.round(width * 0.088);
  const body = Math.round(width * 0.079);
  const stack = "ui-sans-serif, system-ui, -apple-system, Helvetica, Arial";

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = tint;
  ctx.font = `500 ${body}px ${stack}`;

  const lines = fold(ctx, title, width - inset * 2, 2);
  let baseline = height - inset;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    ctx.fillText(lines[i], inset, baseline);
    baseline -= body * 1.2;
  }

  if (meta) {
    const typo = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if (typeof typo.letterSpacing === "string") typo.letterSpacing = "0.18em";
    ctx.globalAlpha = 0.66;
    ctx.font = `500 ${Math.round(body * 0.52)}px ${stack}`;
    ctx.fillText(meta.toUpperCase(), inset, baseline - body * 0.24);
  }

  return sheet;
};

const blank = () => {
  const pixel = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 0]),
    1,
    1,
    THREE.RGBAFormat,
  );
  pixel.needsUpdate = true;
  return pixel;
};

interface Sheet {
  map: THREE.Texture;
  ratio: number;
}

const useImageSheets = (urls: string[]) => {
  const [sheets, setSheets] = useState<Record<string, Sheet>>({});
  const held = useRef<Record<string, Sheet>>({});
  const wanted = urls.join("|");

  useEffect(() => {
    const list = wanted ? wanted.split("|") : [];
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let alive = true;

    for (const url of list) {
      if (held.current[url]) continue;
      loader.load(url, (map) => {
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        map.generateMipmaps = true;
        map.minFilter = THREE.LinearMipmapLinearFilter;
        map.magFilter = THREE.LinearFilter;
        map.needsUpdate = true;
        const source = map.image as { width: number; height: number };
        if (!alive) {
          map.dispose();
          return;
        }
        held.current[url] = {
          map,
          ratio: source.width / Math.max(1, source.height),
        };
        setSheets({ ...held.current });
      });
    }

    return () => {
      alive = false;
    };
  }, [wanted]);

  useEffect(() => {
    const bin = held.current;
    return () => {
      for (const key of Object.keys(bin)) bin[key].map.dispose();
    };
  }, []);

  return sheets;
};

const useLabelSheets = (
  items: LenticularCarouselItem[],
  ratio: number,
  tint: string,
) => {
  const stamp = JSON.stringify(
    items.map((entry) => [entry.title ?? "", entry.meta ?? ""]),
  );

  return useMemo(() => {
    if (typeof document === "undefined") return [] as THREE.Texture[];
    const rows = JSON.parse(stamp) as [string, string][];
    return rows.map(([title, meta]) => {
      const map = new THREE.CanvasTexture(paintLabel(title, meta, ratio, tint));
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.needsUpdate = true;
      return map;
    });
  }, [stamp, ratio, tint]);
};

const Rig = ({ distance }: { distance: number }) => {
  const read = useThree((state) => state.get);
  const height = useThree((state) => state.size.height);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const lens = read().camera as THREE.PerspectiveCamera;
    const reach = Math.max(120, distance);
    lens.fov = (2 * Math.atan(Math.max(1, height) / 2 / reach) * 180) / Math.PI;
    lens.position.set(0, 0, reach);
    lens.near = reach * 0.02;
    lens.far = reach * 6;
    lens.updateProjectionMatrix();
    invalidate();
  }, [read, height, distance, invalidate]);

  return null;
};

interface Pulse {
  flip: number;
  turn: number;
  hot: number;
}

interface DeckProps {
  items: LenticularCarouselItem[];
  sheets: Record<string, Sheet>;
  labels: THREE.Texture[];
  fallback: THREE.Texture;
  focused: number;
  pitch: number;
  cardW: number;
  cardH: number;
  ratio: number;
  radius: number;
  ribs: number;
  rake: number;
  bend: number;
  ridge: number;
  foil: number;
  foilScale: number;
  veil: number;
  tagOn: number;
  turnAngle: number;
  travel: number;
  lift: number;
  minScale: number;
  minDim: number;
  grip: number;
  hoverable: boolean;
  trigger: "hover" | "focus";
  loop: boolean;
  dragging: boolean;
  drag: React.RefObject<{ dx: number }>;
  still: boolean;
}

const Deck = ({
  items,
  sheets,
  labels,
  fallback,
  focused,
  pitch,
  cardW,
  cardH,
  ratio,
  radius,
  ribs,
  rake,
  bend,
  ridge,
  foil,
  foilScale,
  veil,
  tagOn,
  turnAngle,
  travel,
  lift,
  minScale,
  minDim,
  grip,
  hoverable,
  trigger,
  loop,
  dragging,
  drag,
  still,
}: DeckProps) => {
  const invalidate = useThree((state) => state.invalidate);
  const viewport = useThree((state) => state.size.width);

  const cards = useRef<(THREE.Mesh | null)[]>([]);
  const pulses = useRef<Pulse[]>([]);
  const hot = useRef(-1);
  const graze = useRef(0.5);
  const glide = useRef(focused);
  const drift = useRef(0);
  const anchor = useRef(focused);
  const held = useRef(false);
  const clock = useRef(0);
  const hold = useRef(16);

  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const skins = useMemo(
    () =>
      items.map(
        () =>
          new THREE.ShaderMaterial({
            vertexShader: cardVertex,
            fragmentShader: cardFragment,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
              uRest: { value: null },
              uTurn: { value: null },
              uTag: { value: null },
              uFitRest: { value: new THREE.Vector2(1, 1) },
              uFitTurn: { value: new THREE.Vector2(1, 1) },
              uSpan: { value: new THREE.Vector2(1, 1) },
              uFlip: { value: 0 },
              uRibs: { value: 56 },
              uRake: { value: 0.6 },
              uBend: { value: 0.32 },
              uRidge: { value: 0.5 },
              uFoil: { value: 0.5 },
              uFoilScale: { value: 8 },
              uVeil: { value: 0.85 },
              uTag0: { value: 1 },
              uTime: { value: 0 },
              uTurnAngle: { value: 0 },
              uEngage: { value: 0 },
              uDim: { value: 1 },
              uRadius: { value: 14 },
              uAlpha: { value: 0 },
            },
          }),
      ),
    [items],
  );

  useEffect(() => {
    const bin = skins;
    return () => {
      for (const skin of bin) skin.dispose();
    };
  }, [skins]);

  useEffect(() => {
    const shape = plane;
    return () => shape.dispose();
  }, [plane]);

  useEffect(() => {
    hold.current = 16;
    invalidate();
  }, [
    invalidate,
    focused,
    sheets,
    labels,
    pitch,
    cardW,
    cardH,
    radius,
    ribs,
    rake,
    bend,
    ridge,
    foil,
    foilScale,
    veil,
    tagOn,
    turnAngle,
    travel,
    lift,
    minScale,
    minDim,
    loop,
    dragging,
    still,
  ]);

  const touch = useCallback(
    (index: number, along: number) => {
      hot.current = index;
      if (index >= 0) graze.current = along;
      hold.current = 16;
      invalidate();
    },
    [invalidate],
  );

  useFrame((_, raw) => {
    const beat = Math.min(raw, 0.05);
    if (!still) clock.current += beat;

    const count = items.length;
    if (pulses.current.length !== count) {
      pulses.current = items.map(() => ({ flip: 0, turn: 0, hot: 0 }));
    }

    const pull = 1 - Math.pow(1 - grip, beat * 60);
    const span = Math.max(1, pitch);

    if (dragging) {
      hold.current = 4;
      if (!held.current) {
        held.current = true;
        anchor.current = glide.current;
      }
      let aim = anchor.current - drag.current.dx / span;
      if (!loop) {
        const top = count - 1;
        if (aim < 0) aim *= 0.32;
        else if (aim > top) aim = top + (aim - top) * 0.32;
      }
      drift.current =
        beat > 0 ? clamp((aim - glide.current) / beat, -40, 40) : 0;
      glide.current = aim;
    } else {
      held.current = false;
      const target = loop
        ? glide.current + nearest(focused - glide.current, count)
        : focused;
      const rate = clamp(-60 * Math.log(1 - grip) * 1.35, 3, 40);
      const fade = Math.exp(-rate * beat);
      const off = glide.current - target;
      const slope = drift.current + rate * off;
      glide.current = target + (off + slope * beat) * fade;
      drift.current = (slope - rate * (off + slope * beat)) * fade;
      if (
        Math.abs(glide.current - target) < 0.0002 &&
        Math.abs(drift.current) < 0.002
      ) {
        glide.current = target;
        drift.current = 0;
      } else {
        hold.current = 16;
      }
    }

    const reach = Math.ceil(viewport / (2 * span)) + 1;
    const cursor = dragging || !hoverable ? -1 : hot.current;
    const arc = clamp(travel, 0.05, 1);
    const margin = (1 - arc) / 2;
    const dial = clamp((graze.current - margin) / arc, 0, 1);
    const steady = trigger === "focus" || !hoverable;

    for (let i = 0; i < count; i += 1) {
      const card = cards.current[i];
      if (!card) continue;

      const raw = i - glide.current;
      const rel = loop ? nearest(raw, count) : raw;
      if (Math.abs(rel) > reach) {
        card.visible = false;
        continue;
      }
      card.visible = true;

      const pulse = pulses.current[i];
      const wantHot = cursor === i ? 1 : 0;
      const wantFlip = steady
        ? Math.abs(rel) < 0.5
          ? 1
          : 0
        : cursor === i
          ? dial
          : 0;
      const wantTurn = steady
        ? wantFlip * turnAngle
        : wantHot * (wantFlip * 2 - 1) * turnAngle;

      pulse.hot += (wantHot - pulse.hot) * pull;
      pulse.flip += (wantFlip - pulse.flip) * pull;
      pulse.turn += (wantTurn - pulse.turn) * pull;

      if (
        Math.abs(wantHot - pulse.hot) > 0.002 ||
        Math.abs(wantFlip - pulse.flip) > 0.002 ||
        Math.abs(wantTurn - pulse.turn) > 0.0004
      ) {
        hold.current = 16;
      }
      if (pulse.hot > 0.02 && foil > 0 && !still) hold.current = 16;

      const away = Math.min(1, Math.abs(rel));
      const near = 1 - away * away * (3 - 2 * away);
      const grade = minScale + (1 - minScale) * near;

      card.position.set(rel * pitch, 0, pulse.hot * lift);
      card.rotation.y = pulse.turn;
      card.scale.set(cardW * grade, cardH * grade, 1);
      card.renderOrder = pulse.hot > 0.01 ? 2 : 1;

      const item = items[i];
      const rest = sheets[item.src];
      const turn = sheets[item.flipSrc ?? item.src] ?? rest;
      const bank = (card.material as THREE.ShaderMaterial).uniforms;

      bank.uRest.value = rest ? rest.map : fallback;
      bank.uTurn.value = turn ? turn.map : fallback;
      bank.uTag.value = labels[i] ?? fallback;

      if (rest) {
        const wide = rest.ratio > ratio;
        bank.uFitRest.value.set(
          wide ? ratio / rest.ratio : 1,
          wide ? 1 : rest.ratio / ratio,
        );
      }
      if (turn) {
        const wide = turn.ratio > ratio;
        bank.uFitTurn.value.set(
          wide ? ratio / turn.ratio : 1,
          wide ? 1 : turn.ratio / ratio,
        );
      }

      bank.uSpan.value.set(cardW, cardH);
      bank.uFlip.value = pulse.flip;
      bank.uRibs.value = ribs;
      bank.uRake.value = rake;
      bank.uBend.value = bend;
      bank.uRidge.value = ridge;
      bank.uFoil.value = foil;
      bank.uFoilScale.value = foilScale;
      bank.uVeil.value = veil;
      bank.uTag0.value = tagOn;
      bank.uTime.value = clock.current;
      bank.uTurnAngle.value = pulse.turn;
      bank.uEngage.value = pulse.hot;
      bank.uDim.value = minDim + (1 - minDim) * near;
      bank.uRadius.value = radius;
      bank.uAlpha.value = rest ? 1 : 0;
    }

    if (hold.current > 0) {
      hold.current -= 1;
      invalidate();
    }
  });

  return (
    <group>
      {items.map((item, index) => (
        <mesh
          key={`${item.src}-${index}`}
          ref={(node) => {
            cards.current[index] = node;
          }}
          geometry={plane}
          material={skins[index]}
          frustumCulled={false}
          onPointerOver={(event) => {
            event.stopPropagation();
            touch(index, event.uv ? event.uv.x : 0.5);
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            touch(index, event.uv ? event.uv.x : 0.5);
          }}
          onPointerOut={() => touch(-1, 0.5)}
        />
      ))}
    </group>
  );
};

const Rail = ({
  items,
  current,
  token,
  onPick,
}: {
  items: LenticularCarouselItem[];
  current: number;
  token: string;
  onPick: (index: number) => void;
}) => (
  <div className="flex w-44 items-center gap-1.5 sm:w-56">
    {items.map((item, index) => (
      <button
        key={`${token}-${index}`}
        type="button"
        onClick={() => onPick(index)}
        aria-label={`Show ${item.title ?? `slide ${index + 1}`}`}
        aria-current={index === current}
        className="relative h-0.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-current/20 transition-colors duration-200 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:bg-current/45"
      >
        <span
          aria-hidden
          className="absolute inset-0 origin-left rounded-full bg-current transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${index === current ? 1 : 0})` }}
        />
      </button>
    ))}
  </div>
);

const Arrow = ({
  side,
  disabled,
  onPress,
}: {
  side: "prev" | "next";
  disabled: boolean;
  onPress: () => void;
}) => {
  const Glyph = side === "prev" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={side === "prev" ? "Previous slide" : "Next slide"}
      className="cursor-pointer p-1 opacity-40 transition-opacity duration-200 hover:opacity-100 disabled:pointer-events-none disabled:opacity-15"
    >
      <Glyph size={16} strokeWidth={2.25} />
    </button>
  );
};

const LenticularCarousel: React.FC<LenticularCarouselProps> = ({
  items = DEFAULT_ITEMS,
  initialIndex = 2,
  cardWidth = 260,
  aspectRatio = "3 / 4",
  gap = 26,
  borderRadius = 14,
  strips = 56,
  sweep = 0.6,
  refraction = 0.32,
  ridge = 0.5,
  foil = 0.5,
  foilScale = 8,
  scrim = 0.85,
  tilt = 14,
  travel = 0.64,
  lift = 40,
  perspective = 1200,
  inactiveScale = 0.9,
  inactiveDim = 0.55,
  speed = 1,
  trigger = "hover",
  showLabels = true,
  labelColor = "#ffffff",
  showControls = true,
  showDots = true,
  loop = false,
  autoplay = false,
  autoplayDelay = 3200,
  enableDrag = true,
  enableKeyboard = true,
  dpr = 2,
  paused = false,
  className,
  onIndexChange,
}) => {
  const count = items.length;
  const token = useId();
  const stage = useRef<HTMLDivElement | null>(null);
  const drag = useRef({
    id: -1,
    from: 0,
    dx: 0,
    last: 0,
    vel: 0,
    at: 0,
    live: false,
  });
  const report = useRef(onIndexChange);

  const [focused, setFocused] = useState(() =>
    settle(initialIndex, count, false),
  );
  const [dragging, setDragging] = useState(false);
  const [hoverable, setHoverable] = useState(true);
  const [calm, setCalm] = useState(false);

  const ratio = useMemo(() => readRatio(aspectRatio), [aspectRatio]);
  const cardW = Math.max(60, cardWidth);
  const cardH = cardW / ratio;
  const pitch = cardW + Math.max(0, gap);

  const urls = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) {
      seen.add(item.src);
      if (item.flipSrc) seen.add(item.flipSrc);
    }
    return Array.from(seen);
  }, [items]);

  const sheets = useImageSheets(urls);
  const labels = useLabelSheets(items, ratio, labelColor);
  const fallback = useMemo(() => blank(), []);

  useEffect(() => {
    const bin = fallback;
    return () => bin.dispose();
  }, [fallback]);

  useEffect(() => {
    const bin = labels;
    return () => {
      for (const map of bin) map.dispose();
    };
  }, [labels]);

  useEffect(() => {
    report.current = onIndexChange;
  }, [onIndexChange]);

  useEffect(() => {
    report.current?.(focused);
  }, [focused]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setHoverable(fine.matches);
      setCalm(slow.matches);
    };
    sync();
    fine.addEventListener("change", sync);
    slow.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      slow.removeEventListener("change", sync);
    };
  }, []);

  const focusSlide = useCallback(
    (index: number) => setFocused(settle(index, count, loop)),
    [count, loop],
  );

  const step = useCallback(
    (delta: number) => setFocused((from) => settle(from + delta, count, loop)),
    [count, loop],
  );

  useEffect(() => {
    if (!autoplay || count <= 1 || dragging) return;
    const tick = window.setInterval(
      () =>
        setFocused((from) =>
          from + 1 >= count && !loop ? from : settle(from + 1, count, loop),
        ),
      Math.max(autoplayDelay, 600),
    );
    return () => window.clearInterval(tick);
  }, [autoplay, autoplayDelay, count, loop, dragging]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!enableKeyboard) return;
    const delta =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!delta) return;
    event.preventDefault();
    step(delta);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enableDrag || count < 2 || event.button !== 0) return;
    const node = stage.current;
    if (!node) return;
    node.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      from: event.clientX,
      dx: 0,
      last: event.clientX,
      vel: 0,
      at: event.timeStamp,
      live: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const grab = drag.current;
    if (grab.id !== event.pointerId) return;
    const gap = Math.max(4, event.timeStamp - grab.at);
    grab.vel = grab.vel * 0.6 + ((event.clientX - grab.last) / gap) * 0.4;
    grab.last = event.clientX;
    grab.at = event.timeStamp;
    grab.dx = event.clientX - grab.from;
    if (!grab.live && Math.abs(grab.dx) > 4) {
      grab.live = true;
      setDragging(true);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const grab = drag.current;
    if (grab.id !== event.pointerId) return;
    stage.current?.releasePointerCapture(event.pointerId);
    grab.id = -1;
    if (!grab.live) return;

    const idle = event.timeStamp - grab.at;
    const vel = idle > 90 ? 0 : grab.vel * (1 - idle / 90);
    const span = Math.max(1, pitch);
    const swept = -grab.dx / span;
    const flick = clamp((-vel * FLICK_WEIGHT) / span, -2.5, 2.5);
    const reach = swept + flick;

    let moves = Math.round(reach);
    if (moves === 0 && Math.abs(reach) > 0.18) moves = reach < 0 ? -1 : 1;

    setDragging(false);
    if (moves) step(moves);
  };

  const head = !loop && focused <= 0;
  const tail = !loop && focused >= count - 1;

  return (
    <div
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label="Lenticular carousel"
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex w-full select-none flex-col items-center text-neutral-900 outline-none dark:text-neutral-100",
        className,
      )}
    >
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        className={cn(
          "relative min-h-0 w-full flex-1 touch-pan-y",
          enableDrag && count > 1 && "cursor-grab active:cursor-grabbing",
        )}
      >
        <Canvas
          camera={{ position: [0, 0, perspective], fov: 30 }}
          dpr={[1, clamp(dpr, 1, 3)]}
          gl={{
            antialias: false,
            alpha: true,
            depth: false,
            stencil: false,
            powerPreference: "high-performance",
          }}
          frameloop="demand"
        >
          <Rig distance={perspective} />
          <Deck
            items={items}
            sheets={sheets}
            labels={labels}
            fallback={fallback}
            focused={focused}
            pitch={pitch}
            cardW={cardW}
            cardH={cardH}
            ratio={ratio}
            radius={Math.max(0, borderRadius)}
            ribs={Math.max(1, Math.round(strips))}
            rake={clamp(sweep, 0, 3)}
            bend={Math.max(0, refraction)}
            ridge={clamp(ridge, 0, 2)}
            foil={Math.max(0, foil)}
            foilScale={Math.max(0.2, foilScale)}
            veil={clamp(scrim, 0, 1)}
            tagOn={showLabels ? 1 : 0}
            turnAngle={(clamp(tilt, -80, 80) * Math.PI) / 180}
            travel={travel}
            lift={lift}
            minScale={clamp(inactiveScale, 0.2, 1)}
            minDim={clamp(inactiveDim, 0, 1)}
            grip={clamp(0.12 * clamp(speed, 0.1, 4), 0.01, 0.6)}
            hoverable={hoverable}
            trigger={trigger}
            loop={loop}
            dragging={dragging}
            drag={drag}
            still={paused || calm}
          />
        </Canvas>
      </div>

      {(showControls || showDots) && count > 1 && (
        <div className="mt-6 flex shrink-0 items-center gap-4">
          {showControls && (
            <Arrow side="prev" disabled={head} onPress={() => step(-1)} />
          )}
          {showDots && (
            <Rail
              items={items}
              current={focused}
              token={token}
              onPick={focusSlide}
            />
          )}
          {showControls && (
            <Arrow side="next" disabled={tail} onPress={() => step(1)} />
          )}
        </div>
      )}
    </div>
  );
};

export default LenticularCarousel;
