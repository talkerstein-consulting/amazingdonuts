import { useState } from "react";
import { User } from "lucide-react";
import Wedge from "./Wedge.jsx";

const LINKS = [
  ["Menu", "#menu"],
  ["Build a Dozen", "#build"],
  ["Custom Donut", "#build-your-own"],
  ["Our Bakery", "#bakery"],
  ["Visit", "#visit"]
];

export default function Masthead({ onAccount, user }) {
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
          <button className="nav-account" type="button" onClick={() => { setOpen(false); onAccount(); }} aria-label={user ? `Open account for ${user.firstName}` : "Sign in or create account"} title="Account"><User /><span>{user ? user.firstName : "Account"}</span></button>
          <Wedge label="Order Ahead" href="#build" family="sunshine" biteBg="#00A3DC" onClick={() => setOpen(false)} />
        </nav>
      </div>
    </header>
  );
}
