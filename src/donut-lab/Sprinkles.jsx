import { useEffect, useRef, useState } from "react";

/* The topping art for each shape is a flat scatter of ~70 rounded "jimmy"
   rects, hand-placed to sit on that shape's icing. The builder used to paint
   it as a single CSS mask, which meant one flat tint for the whole layer —
   so a multi-colour sprinkle like Rainbow came out solid blue.

   Inlining the SVG instead lets every mark carry its own colour and its own
   animation delay, so the sprinkles land one after another. The hand-placed
   positions are kept exactly as drawn. */

/* One fetch per shape, shared by the stage and every option card. */
const cache = new Map();

function loadSvg(src) {
  if (!cache.has(src)) {
    cache.set(
      src,
      fetch(src)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${src}`))))
        .catch(() => null)
    );
  }
  return cache.get(src);
}

/* Deterministic 0..1 from an index — spreads the delays around so the marks
   don't land in a visible left-to-right sweep. */
const jitter = (i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export default function Sprinkles({ src, colors = [], animate = false, seq = 0, className = "" }) {
  const hostRef = useRef(null);
  const [markup, setMarkup] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!src) {
      setMarkup(null);
      return;
    }
    loadSvg(src).then((text) => {
      if (alive) setMarkup(text);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!markup) {
      host.replaceChildren();
      return;
    }

    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) {
      host.replaceChildren();
      return;
    }

    /* Scale to the layer rather than its authored 1024px box. */
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("class", "bld__sprinkleSvg");

    const marks = [...svg.querySelectorAll("rect, circle, ellipse, path")];
    marks.forEach((mark, i) => {
      /* Each mark keeps its own rotate/position attributes; the animation goes
         on a wrapper so a CSS transform can never overwrite them. */
      const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "bld__sprinkle");
      if (animate) {
        const delay = (i * 6 + jitter(i) * 260).toFixed(0);
        g.style.setProperty("--d", `${delay}ms`);
      }
      mark.parentNode.insertBefore(g, mark);
      g.appendChild(mark);

      if (colors.length) mark.setAttribute("fill", colors[i % colors.length]);
    });

    svg.dataset.animate = animate ? "1" : "0";
    host.replaceChildren(svg);
  }, [markup, colors.join(","), animate, seq]);

  return <span ref={hostRef} className={className} aria-hidden="true" />;
}
