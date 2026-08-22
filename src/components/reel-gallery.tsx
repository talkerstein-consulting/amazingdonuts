"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";

const defaultPlates = [
  "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470075801209-17f9ec0cada6?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470723710355-95304d8aece4?q=75&w=520&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=75&w=520&auto=format&fit=crop",
];

export interface ReelGalleryProps {
  /** Image URLs spread across the reels */
  images?: string[];
  /** Number of stacked reels */
  rows?: number;
  /** Height of every plate in pixels */
  rowHeight?: number;
  /** Vertical space between reels in pixels */
  rowGap?: number;
  /** Horizontal space between plates in pixels */
  itemGap?: number;
  /** Widest a plate may get, as a multiple of its height */
  maxAspect?: number;
  /** Narrowest a plate may get, as a multiple of its height */
  minAspect?: number;
  /** Angle the whole stack leans by, in degrees */
  tilt?: number;
  /** How far each reel arches across the frame, in pixels */
  arch?: number;
  /** Master multiplier on how far input travels */
  speed?: number;
  /** How much reel speeds differ from one another, 0 to 1 */
  speedVariance?: number;
  /** Send every other reel the opposite way */
  alternate?: boolean;
  /** Pixels per second the reels drift on their own */
  autoScroll?: number;
  /** How long a flick keeps gliding, 0 to 1 */
  inertia?: number;
  /** How quickly the reels catch up to input, 0 to 1 */
  damping?: number;
  /** How far a drag pushes the reels */
  dragSensitivity?: number;
  /** How far a wheel notch pushes the reels */
  wheelSensitivity?: number;
  /** Corner radius of a plate in pixels */
  radius?: number;
  /** How desaturated plates sit at rest, 0 to 1 */
  grayscale?: number;
  /** Radius of the colour spotlight under the cursor, in pixels */
  focusRadius?: number;
  /** How much the spotlight restores colour and light, 0 to 1 */
  focusStrength?: number;
  /** How far the left and right edges fade out, 0 to 0.5 */
  fade?: number;
  /** How much the outer reels dim, 0 to 1 */
  dim?: number;
  /** How much the outer reels shrink, 0 to 1 */
  taper?: number;
  /** Overall brightness of the plates */
  brightness?: number;
  /** Backdrop colour behind the reels */
  backgroundColor?: string;
  /** Let the wheel, drag and arrow keys drive the reels */
  interactive?: boolean;
  /** Freeze the drift */
  paused?: boolean;
  /** Highest frame rate the reels redraw at */
  maxFps?: number;
  /** Pixel ratio ceiling */
  dpr?: number;
  className?: string;
  children?: ReactNode;
}

interface Strip {
  texture: THREE.CanvasTexture;
  span: number;
  edge: number;
}

const scatter = (seed: number) => {
  const spun = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return spun - Math.floor(spun);
};

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

const stripVertex = `
uniform vec2 uSize;
varying vec2 vPos;

void main() {
  vPos = position.xy * uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const stripFragment = `
precision highp float;

uniform sampler2D uAtlas;
uniform vec2 uSize;
uniform float uRows;
uniform float uPitch;
uniform float uRowHeight;
uniform float uArch;
uniform float uPlaneWidth;
uniform float uLean;
uniform float uReach;
uniform float uEdge;
uniform float uAt;
uniform float uSpeed;
uniform float uVariance;
uniform float uAlternate;
uniform float uDim;
uniform float uTaper;
uniform float uGray;
uniform float uBright;
uniform float uReveal;
uniform float uFade;
uniform vec2 uPointer;
uniform float uFocusRadius;
uniform float uFocusStrength;

varying vec2 vPos;

float scatter(float seed) {
  float spun = sin(seed * 127.1 + 311.7) * 43758.5453;
  return spun - floor(spun);
}

void main() {
  float c = cos(uLean);
  float s = sin(uLean);
  vec2 q = vec2(vPos.x * c - vPos.y * s, vPos.x * s + vPos.y * c);

  float f = q.x / uPlaneWidth;
  float sy = q.y - (0.25 - f * f) * uArch;

  float middle = (uRows - 1.0) * 0.5;
  float row = floor(middle - sy / uPitch + 0.5);
  if (row < 0.0 || row > uRows - 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float reach = max(middle, 1.0);
  float away = abs(row - middle) / reach;
  float shrink = max(1.0 - uTaper * away, 0.05);
  float band = uRowHeight * shrink;

  float local = sy + (row - middle) * uPitch;
  float lip = band * 0.5;
  float rim = 1.0 - smoothstep(lip - 0.75, lip + 0.25, abs(local));
  if (rim < 0.002) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float swing = (scatter(row + 17.0) * 2.0 - 1.0) * uVariance;
  float flip = (uAlternate > 0.5 && mod(row, 2.0) > 0.5) ? -1.0 : 1.0;
  float pace = (1.0 + swing) * flip;

  float ux = q.x / shrink;
  float u = (ux + uAt * uSpeed * pace) / uReach + scatter(row + 3.0);
  float v = clamp(local / band + 0.5, uEdge, 1.0 - uEdge);

  vec4 texel = texture2D(uAtlas, vec2(u, v));
  float mass = texel.a;
  vec3 base = texel.rgb / max(mass, 0.0025);
  float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));

  float glow = 0.0;
  if (uFocusStrength > 0.001 && uFocusRadius > 0.001) {
    float span = length(vPos - uPointer) / uFocusRadius;
    glow = uFocusStrength * (1.0 - smoothstep(0.35, 1.0, span));
  }

  float drain = clamp(uGray * (1.0 - glow), 0.0, 1.0);
  vec3 tone = mix(base, vec3(lum), drain) * uBright * (1.0 + glow * 0.28);

  float wash = 1.0;
  if (uFade > 0.001) {
    float edge = abs(vPos.x) / max(uSize.x * 0.5, 1.0);
    wash = 1.0 - smoothstep(1.0 - uFade * 2.0, 1.0, edge);
  }

  float veil = mass * rim * wash * uReveal * (1.0 - uDim * away);
  gl_FragColor = vec4(tone * veil, veil);
}
`;

const cover = (
  ctx: CanvasRenderingContext2D,
  art: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  round: number,
) => {
  ctx.save();
  ctx.beginPath();
  const lip = Math.min(round, w * 0.5, h * 0.5);
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, lip);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();

  const ratio = art.naturalWidth / art.naturalHeight;
  let dw = w;
  let dh = w / ratio;
  if (dh < h) {
    dh = h;
    dw = h * ratio;
  }
  ctx.drawImage(art, x + (w - dw) * 0.5, y + (h - dh) * 0.5, dw, dh);
  ctx.restore();
};

const Reels = ({
  strip,
  size,
  planeWidth,
  rowHeight,
  rowGap,
  reelCount,
  atlasScale,
  tilt,
  arch,
  gray,
  bright,
  focusRadius,
  focusStrength,
  speed,
  speedVariance,
  alternate,
  dim,
  taper,
  veil,
  maxFps,
  advance,
}: {
  strip: Strip;
  size: { w: number; h: number };
  planeWidth: number;
  rowHeight: number;
  rowGap: number;
  reelCount: number;
  atlasScale: number;
  tilt: number;
  arch: number;
  gray: number;
  bright: number;
  focusRadius: number;
  focusStrength: number;
  speed: number;
  speedVariance: number;
  alternate: boolean;
  dim: number;
  taper: number;
  veil: number;
  maxFps: number;
  advance: (beat: number) => [number, number, number];
}) => {
  const { invalidate } = useThree();
  const skin = useRef<THREE.ShaderMaterial | null>(null);
  const reveal = useRef(0);
  const glow = useRef(new THREE.Vector2(1e5, 1e5));

  const banks = useMemo(
    () => [
      {
        uAtlas: { value: null as THREE.Texture | null },
        uSize: { value: new THREE.Vector2(1, 1) },
        uRows: { value: 1 },
        uPitch: { value: 1 },
        uRowHeight: { value: 1 },
        uArch: { value: 0 },
        uPlaneWidth: { value: 1 },
        uLean: { value: 0 },
        uReach: { value: 1 },
        uEdge: { value: 0 },
        uAt: { value: 0 },
        uSpeed: { value: 1 },
        uVariance: { value: 0 },
        uAlternate: { value: 0 },
        uDim: { value: 0 },
        uTaper: { value: 0 },
        uGray: { value: 0 },
        uBright: { value: 1 },
        uReveal: { value: 0 },
        uFade: { value: 0 },
        uPointer: { value: new THREE.Vector2(1e5, 1e5) },
        uFocusRadius: { value: 0 },
        uFocusStrength: { value: 0 },
      },
    ],
    [],
  );

  useFrame((_, delta) => {
    const beat = Math.min(delta, 0.05);
    const [at, px, py] = advance(beat);

    reveal.current += (1 - reveal.current) * Math.min(beat * 3.2, 1);
    glow.current.x += (px - glow.current.x) * Math.min(beat * 9, 1);
    glow.current.y += (py - glow.current.y) * Math.min(beat * 9, 1);

    const bank = skin.current?.uniforms;
    if (!bank) return;
    bank.uAtlas.value = strip.texture;
    bank.uSize.value.set(size.w, size.h);
    bank.uRows.value = reelCount;
    bank.uPitch.value = rowHeight + rowGap;
    bank.uRowHeight.value = rowHeight;
    bank.uArch.value = arch;
    bank.uPlaneWidth.value = planeWidth;
    bank.uLean.value = (tilt * Math.PI) / 180;
    bank.uReach.value = Math.max(strip.span * atlasScale, 1);
    bank.uEdge.value = strip.edge;
    bank.uAt.value = at;
    bank.uSpeed.value = speed;
    bank.uVariance.value = speedVariance;
    bank.uAlternate.value = alternate ? 1 : 0;
    bank.uDim.value = clamp(dim, 0, 1);
    bank.uTaper.value = clamp(taper, 0, 1);
    bank.uGray.value = gray;
    bank.uBright.value = bright;
    bank.uReveal.value = reveal.current;
    bank.uFade.value = veil;
    bank.uPointer.value.copy(glow.current);
    bank.uFocusRadius.value = focusRadius;
    bank.uFocusStrength.value = focusStrength;
  });

  useEffect(() => {
    const gap = 1000 / Math.max(1, maxFps);
    let frame = 0;
    let prev = 0;
    const slack = Math.min(4, gap * 0.5);
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - prev < gap - slack) return;
      prev = now;
      invalidate();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [invalidate, maxFps]);

  return (
    <mesh scale={[size.w, size.h, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={skin}
        vertexShader={stripVertex}
        fragmentShader={stripFragment}
        uniforms={banks[0]}
        transparent
        premultipliedAlpha
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

export const ReelGallery = ({
  images = defaultPlates,
  rows = 6,
  rowHeight = 92,
  rowGap = 20,
  itemGap = 16,
  maxAspect = 2,
  minAspect = 0.6,
  tilt = 7,
  arch = 48,
  speed = 1,
  speedVariance = 0.55,
  alternate = false,
  autoScroll = 26,
  inertia = 0.92,
  damping = 0.1,
  dragSensitivity = 1.6,
  wheelSensitivity = 1,
  radius = 10,
  grayscale = 0.55,
  focusRadius = 210,
  focusStrength = 0.85,
  fade = 0.12,
  dim = 0.35,
  taper = 0.12,
  brightness = 1,
  backgroundColor = "transparent",
  interactive = true,
  paused = false,
  maxFps = 60,
  dpr = 1.25,
  className,
  children,
}: ReelGalleryProps) => {
  const shell = useRef<HTMLDivElement>(null);
  const pulse = useRef({ at: 0, aim: 0, push: 0, held: false });
  const pointer = useRef({ x: 1e5, y: 1e5, live: false });
  const frame = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const calm = useRef(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [art, setArt] = useState<HTMLImageElement[]>([]);
  const [awake, setAwake] = useState(false);

  const pool = useMemo(
    () => (images.length > 0 ? images : defaultPlates),
    [images],
  );

  useEffect(() => {
    let alive = true;
    const loaded: HTMLImageElement[] = [];
    let pending = pool.length;
    if (pending === 0) return;

    pool.forEach((src) => {
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      const settle = () => {
        if (probe.naturalWidth > 0) loaded.push(probe);
        pending -= 1;
        if (pending === 0 && alive) setArt(loaded);
      };
      probe.onload = settle;
      probe.onerror = settle;
      probe.src = src;
    });

    return () => {
      alive = false;
    };
  }, [pool]);

  useEffect(() => {
    const node = shell.current;
    if (!node) return;
    if (typeof ResizeObserver !== "undefined") {
      const watcher = new ResizeObserver(([entry]) => {
        frame.current = node.getBoundingClientRect();
        setBox({
          w: Math.round(entry.contentRect.width),
          h: Math.round(entry.contentRect.height),
        });
      });
      watcher.observe(node);
      return () => watcher.disconnect();
    }
    setBox({ w: node.clientWidth, h: node.clientHeight });
  }, []);

  useEffect(() => {
    const node = shell.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setAwake(true));
      return () => cancelAnimationFrame(id);
    }
    const spy = new IntersectionObserver(
      ([entry]) => setAwake(entry.isIntersecting),
      { rootMargin: "180px" },
    );
    spy.observe(node);
    return () => spy.disconnect();
  }, []);

  useEffect(() => {
    const node = shell.current;
    if (!node) return;
    const remeasure = () => {
      frame.current = node.getBoundingClientRect();
    };
    remeasure();
    window.addEventListener("scroll", remeasure, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", remeasure, { passive: true });
    return () => {
      window.removeEventListener("scroll", remeasure, { capture: true });
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      calm.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const reelCount = clamp(Math.round(rows), 1, 24);
  const plateHeight = Math.max(24, rowHeight);
  const wide = Math.max(0.2, maxAspect);
  const narrow = clamp(minAspect, 0.2, wide);
  const cap = plateHeight * wide;
  const lean = (Math.abs(tilt) * Math.PI) / 180;
  const planeWidth = Math.max(
    320,
    Math.round(
      box.w / Math.max(Math.cos(lean), 0.25) +
        Math.tan(lean) * plateHeight * reelCount +
        cap,
    ),
  );

  const wantHeight = Math.max(32, Math.ceil(plateHeight / 32) * 32);
  const wantSpan = Math.max(
    512,
    Math.ceil(((planeWidth * wantHeight) / plateHeight / 512) * 1) * 512,
  );
  const [bake, setBake] = useState({ height: wantHeight, span: wantSpan });

  useEffect(() => {
    if (bake.height === wantHeight && bake.span === wantSpan) return;
    const id = setTimeout(
      () => setBake({ height: wantHeight, span: wantSpan }),
      160,
    );
    return () => clearTimeout(id);
  }, [wantHeight, wantSpan, bake]);

  const atlasScale = plateHeight / bake.height;

  const strips = useMemo<Strip[]>(() => {
    if (art.length === 0) return [];
    const sample = clamp(dpr, 1, 1.6);
    const made: Strip[] = [];
    const decks = 1;

    for (let deck = 0; deck < decks; deck += 1) {
      const lead = Math.round(scatter(deck + 1) * art.length);
      const picks: { art: HTMLImageElement; width: number }[] = [];
      let span = 0;
      let index = 0;

      while ((span < bake.span || picks.length < 3) && index < 64) {
        const frame = art[(lead + index) % art.length];
        const ratio = frame.naturalWidth / frame.naturalHeight;
        const width = Math.round(bake.height * clamp(ratio, narrow, wide));
        picks.push({ art: frame, width });
        span += width + itemGap;
        index += 1;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2, Math.round(span * sample));
      canvas.height = Math.max(2, Math.round(bake.height * sample));
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.scale(sample, sample);

      const tall = canvas.height / sample;
      let cursor = 0;
      picks.forEach((pick) => {
        cover(ctx, pick.art, cursor, 0, pick.width, tall, radius);
        cursor += pick.width + itemGap;
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.premultiplyAlpha = true;
      texture.colorSpace = THREE.SRGBColorSpace;

      made.push({ texture, span, edge: 0.5 / canvas.height });
    }

    return made;
  }, [art, bake, wide, narrow, itemGap, radius, dpr]);

  useEffect(
    () => () => {
      strips.forEach((item) => item.texture.dispose());
    },
    [strips],
  );

  const advance = useCallback(
    (beat: number): [number, number, number] => {
      const flow = pulse.current;
      const spot = pointer.current;
      const step = beat * 60;

      if (!flow.held) {
        flow.aim += flow.push * step;
        flow.push *= Math.pow(clamp(inertia, 0, 0.995), step);
        if (Math.abs(flow.push) < 0.4) flow.push = 0;
      }
      if (!paused && !calm.current) flow.aim += autoScroll * beat;

      const grip = flow.held ? 0.3 : clamp(damping, 0.01, 1);
      flow.at += (flow.aim - flow.at) * (1 - Math.pow(1 - grip, step));

      return [flow.at, spot.live ? spot.x : 1e5, spot.live ? spot.y : 1e5];
    },
    [inertia, damping, autoScroll, paused],
  );

  const nudge = useCallback((amount: number, kick: number) => {
    pulse.current.aim += amount;
    pulse.current.push = kick;
  }, []);

  useEffect(() => {
    const node = shell.current;
    if (!node || !interactive) return;

    const track = (event: PointerEvent) => {
      const rect = frame.current;
      pointer.current.x = event.clientX - rect.left - rect.width * 0.5;
      pointer.current.y = rect.height * 0.5 - (event.clientY - rect.top);
      pointer.current.live = true;
    };

    const onWheel = (event: WheelEvent) => {
      const step = event.deltaY + event.deltaX;
      if (step === 0) return;
      event.preventDefault();
      nudge(step * wheelSensitivity, step * 0.15 * wheelSensitivity);
    };

    let grabId = -1;
    let lastX = 0;
    let lastY = 0;

    const onDown = (event: PointerEvent) => {
      grabId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      pulse.current.held = true;
      pulse.current.push = 0;
      node.setPointerCapture(event.pointerId);
    };

    const onMove = (event: PointerEvent) => {
      track(event);
      if (event.pointerId !== grabId) return;
      const step =
        (event.clientY - lastY - (event.clientX - lastX)) * dragSensitivity;
      lastX = event.clientX;
      lastY = event.clientY;
      pulse.current.aim += step;
      pulse.current.push = step * 0.25;
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== grabId) return;
      grabId = -1;
      pulse.current.held = false;
      if (node.hasPointerCapture(event.pointerId)) {
        node.releasePointerCapture(event.pointerId);
      }
    };

    const onLeave = () => {
      pointer.current.live = false;
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudge(60, 9);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudge(-60, -9);
      }
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("pointerdown", onDown);
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
    node.addEventListener("pointerleave", onLeave);
    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("pointerdown", onDown);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onUp);
      node.removeEventListener("pointerleave", onLeave);
      node.removeEventListener("keydown", onKey);
    };
  }, [interactive, wheelSensitivity, dragSensitivity, nudge]);

  const veil = clamp(fade, 0, 0.5);

  return (
    <div
      ref={shell}
      tabIndex={interactive ? 0 : -1}
      className={cn(
        "relative touch-none overflow-hidden outline-none select-none",
        interactive && "cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{ background: backgroundColor }}
    >
      <div className="absolute inset-0">
        {awake && strips.length > 0 && box.w > 0 ? (
          <Canvas
            orthographic
            camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 500 }}
            dpr={clamp(dpr, 0.75, 1.5)}
            gl={{
              antialias: false,
              alpha: true,
              depth: false,
              stencil: false,
              powerPreference: "high-performance",
            }}
            frameloop="demand"
          >
            <Reels
              strip={strips[0]}
              size={box}
              planeWidth={planeWidth}
              rowHeight={plateHeight}
              rowGap={rowGap}
              reelCount={reelCount}
              atlasScale={atlasScale}
              tilt={tilt}
              arch={arch}
              gray={clamp(grayscale, 0, 1)}
              bright={brightness}
              focusRadius={focusRadius}
              focusStrength={clamp(focusStrength, 0, 1)}
              speed={speed}
              speedVariance={speedVariance}
              alternate={alternate}
              dim={dim}
              taper={taper}
              veil={veil}
              maxFps={maxFps}
              advance={advance}
            />
          </Canvas>
        ) : null}
      </div>
      {children ? (
        <div className="pointer-events-none relative z-10 h-full w-full">
          {children}
        </div>
      ) : null}
    </div>
  );
};

export default ReelGallery;
