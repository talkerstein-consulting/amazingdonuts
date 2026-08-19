import { useEffect, useState } from "react";

const ENDINGS = ["a good decision.", "Friday morning.", "your childhood.", "an excellent life."];

/**
 * The headline's last line, rolling. The window is a full line box taller than
 * the glyphs, so a neighbouring line can never peek in over an ascender.
 */
export default function Roller() {
  const [at, setAt] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setAt((i) => (i + 1) % ENDINGS.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <span className="sr">{ENDINGS[at]}</span>
      <span className="roller" aria-hidden="true">
        <span className="roller__track" style={{ "--roll": `calc(var(--step) * -${at})` }}>
          {ENDINGS.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </span>
      </span>
    </>
  );
}
