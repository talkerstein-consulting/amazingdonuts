import { useCallback } from "react";
import { useReducedMotion } from "./useReducedMotion.js";

const COLORS = ["#00A3DC", "#C4008C", "#F6B316", "#FFFFFF", "#A8D9EF", "#F2A8D6"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/**
 * Sprinkle confetti. Particles live outside the React tree on purpose: they are
 * throwaway decoration, and re-rendering fifty of them per frame would be silly.
 */
export function useSprinkles() {
  const reduced = useReducedMotion();

  const burst = useCallback(
    (x, y, count = 26) => {
      if (reduced) return;
      for (let i = 0; i < count; i++) {
        const s = document.createElement("i");
        s.className = "sprinkle";
        s.style.background = pick(COLORS);
        s.style.left = `${x}px`;
        s.style.top = `${y}px`;
        document.body.appendChild(s);

        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const power = 120 + Math.random() * 220;
        const dx = Math.cos(angle) * power;
        const dy = Math.sin(angle) * power - 140;
        const spin = `${Math.random() * 900 - 450}deg`;
        const duration = 750 + Math.random() * 550;

        const anim = s.animate(
          [
            { transform: "translate(0,0) rotate(0deg) scale(1)" },
            { transform: `translate(${dx * 0.6}px,${dy * 0.7}px) rotate(${spin})`, offset: 0.45 },
            { transform: `translate(${dx}px,${dy + 460}px) rotate(${spin}) scale(0.2)` }
          ],
          { duration, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }
        );
        anim.onfinish = () => s.remove();
        setTimeout(() => s.remove(), duration + 400); /* a backgrounded tab never fires onfinish */
      }
    },
    [reduced]
  );

  const burstFrom = useCallback(
    (node, count) => {
      if (!node) return;
      const r = node.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, count);
    },
    [burst]
  );

  return { burst, burstFrom };
}
