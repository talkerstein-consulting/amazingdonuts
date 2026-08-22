/**
 * The signature CTA button. Basic interface: a plain bordered button, label
 * or icon passed straight through.
 */
export default function Wedge({
  label,
  href,
  family = "sky",
  small = false,
  hidden = false,
  onClick,
  ariaLabel,
  ...rest
}) {
  const Tag = href ? "a" : "button";
  const props = href ? { href } : { type: "button" };

  return (
    <Tag
      className={`wedge${small ? " wedge--sm" : ""}`}
      data-family={family}
      aria-label={ariaLabel}
      hidden={hidden || undefined}
      onClick={onClick}
      {...props}
      {...rest}
    >
      <span className="wedge__label">{label}</span>
    </Tag>
  );
}
