import { useState } from "react";
import Wedge from "./Wedge.jsx";

const LINKS = [
  ["Donuts", "#build"],
  ["Muffins", "#build"],
  ["Cupcakes", "#build"],
  ["Cookies", "#build"],
  ["Challah", "#counter"],
  ["Our Bakery", "#bakery"],
  ["Visit", "#visit"]
];

export default function Masthead() {
  const [open, setOpen] = useState(false);

  return (
    <header className="masthead">
      <div className="wrap masthead__in">
        <a className="logo" href="#top">
          <img src="/assets/logo-amazing-donuts.webp" alt="Amazing Donuts" />
        </a>
        <button
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <i />
          <i />
          <i />
        </button>
        <nav className="nav" aria-label="Primary" data-open={open}>
          {LINKS.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <Wedge label="Order Ahead" href="tel:+14163987546" family="sunshine" biteBg="#00A3DC" />
        </nav>
      </div>
    </header>
  );
}
