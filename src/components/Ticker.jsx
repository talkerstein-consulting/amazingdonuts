import { Fragment } from "react";

const DOTS = [
  "/assets/cutouts/donut-zap.webp",
  "/assets/cutouts/donut-barbie.webp",
  "/assets/cutouts/donut-glazed.webp",
  "/assets/cutouts/cookie-strawberry.webp"
];

/** Two copies of the run, so the -50% loop is seamless. */
export default function Ticker({ lines, tone = "ink", reverse = false }) {
  const run = [...lines, ...lines];

  return (
    <div
      className={`marquee${tone === "sun" ? " marquee--sun" : ""}${reverse ? " marquee--rev" : ""}`}
      aria-hidden="true"
    >
      <div className="marquee__track">
        {run.map((line, i) => (
          <Fragment key={`${line}-${i}`}>
            <span>{line}</span>
            <img src={DOTS[i % DOTS.length]} alt="" />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
