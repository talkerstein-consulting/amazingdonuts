import { useEffect, useRef, useState } from "react";

/**
 * The signature CTA. Two layers: a transformed plate so the shape leans
 * forward, and an untransformed label so the type stays true. Hover rolls the
 * label up to an identical second copy.
 *
 * Primary CTAs also get the bite mechanic: three discs painted in the colour of
 * the surface behind the button are layered over its left edge, so they read as
 * material removed, and two crumbs cut loose on the last frame.
 * `biteBg` MUST be the colour behind the button or the bite will not read.
 */
export default function Wedge({
  label,
  href,
  family = "sky",
  small = false,
  hidden = false,
  bite,
  biteBg = "#FCF4E7",
  onClick,
  ariaLabel,
  ...rest
}) {
  const Tag = href ? "a" : "button";
  const props = href ? { href } : { type: "button" };

  /* primary CTAs bite; the small, secondary ones stay whole */
  const bites = bite ?? !small;

  const [frame, setFrame] = useState(0);
  const timers = useRef([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const enter = () => {
    if (!bites) return;
    clear();
    setFrame(1);
    timers.current = [
      setTimeout(() => setFrame(2), 130),
      setTimeout(() => setFrame(3), 260)
    ];
  };
  const leave = () => {
    if (!bites) return;
    clear();
    setFrame(0);
  };

  return (
    <Tag
      className={`wedge${small ? " wedge--sm" : ""}${bites ? " wedge--bite" : ""}`}
      data-family={family}
      data-frame={bites ? frame : undefined}
      style={bites ? { "--bite-bg": biteBg } : undefined}
      aria-label={ariaLabel || label}
      hidden={hidden || undefined}
      onClick={onClick}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      {...props}
      {...rest}
    >
      <span className="wedge__ground" />
      {bites ? (
        /* plate, then bite, then label — and never overflow:hidden here, or
           the crumbs get cut off mid-fall */
        <span className="bite" aria-hidden="true">
          <i />
          <i />
          <i />
          <b />
          <b />
        </span>
      ) : null}
      <span className="wedge__label">
        <span className="wedge__track">
          <span>{label}</span>
          <span aria-hidden="true">{label}</span>
        </span>
      </span>
    </Tag>
  );
}
