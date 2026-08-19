import { useRef } from "react";
import { useSprinkles } from "../hooks/useSprinkles.js";

/**
 * A small round button that fires sprinkles. On hover (or focus) the words
 * FREE SPRINKLES appear in a ring around it, set on an SVG circle.
 */
export default function SprinkleButton() {
  const btn = useRef(null);
  const { burstFrom } = useSprinkles();

  return (
    <span className="sprinkler">
      <svg className="sprinkler__ring" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <path id="sprinkler-arc" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <text>
          <textPath href="#sprinkler-arc" startOffset="50%" textAnchor="middle">
            FREE SPRINKLES · FREE SPRINKLES ·
          </textPath>
        </text>
      </svg>

      <button
        ref={btn}
        type="button"
        className="sprinkler__btn"
        aria-label="Free sprinkles"
        onClick={() => burstFrom(btn.current, 44)}
      >
        {/* three sprinkles, flat, no shadow */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="9" width="9" height="3.2" rx="1.6" transform="rotate(-24 7.5 10.6)" />
          <rect x="11" y="5" width="9" height="3.2" rx="1.6" transform="rotate(18 15.5 6.6)" />
          <rect x="9" y="15" width="9" height="3.2" rx="1.6" transform="rotate(-8 13.5 16.6)" />
        </svg>
      </button>
    </span>
  );
}
