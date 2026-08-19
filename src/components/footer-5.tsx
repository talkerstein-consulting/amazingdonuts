"use client";

/**
 * React Bits Pro `footer-5`, rebuilt for Amazing Donuts.
 *
 * Kept from the block: the single large panel, the bar motif rising along the
 * bottom edge, the logo + blurb + icon row on the left with link columns on
 * the right, and the fine print bar underneath.
 * Changed: Deep Ink panel with the brand families in the bars (flat colour,
 * no opacity ramp), brand type, and the bakery's own links.
 */

import { CakeSlice, Cookie, Croissant, Donut } from "lucide-react";

const BARS = ["sky", "magenta", "sunshine", "sky", "magenta", "sunshine", "sky", "magenta", "sunshine"];

const COLUMNS = [
  {
    title: "The case",
    links: [
      ["Donuts", "#flavours"],
      ["Muffins", "#flavours"],
      ["Cupcakes", "#flavours"],
      ["Cookies & squares", "#flavours"],
      ["Challah & breads", "#flavours"]
    ]
  },
  {
    title: "Order",
    links: [
      ["Build a dozen", "#build"],
      ["Let the machine decide", "#machine"],
      ["Custom printed dozens", "#printing"],
      ["Donut cakes", "#printing"],
      ["Call (416) 398-7546", "tel:+14163987546"]
    ]
  },
  {
    title: "The bakery",
    links: [
      ["Our story", "#bakery"],
      ["Kashruth — COR 483", "#bakery"],
      ["Allergy policy", "#bakery"],
      ["Visit & hours", "#visit"],
      ["orders@amazingdonuts.com", "mailto:orders@amazingdonuts.com"]
    ]
  }
];

export function Footer5() {
  return (
    <footer className="foot5">
      <div className="wrap">
        <div className="foot5__panel">
          <div className="foot5__bars" aria-hidden="true">
            {BARS.map((family, i) => {
              const dist = Math.abs(i - 4);
              return (
                <span
                  key={i}
                  data-family={family}
                  style={{ height: `${Math.max(22, 92 - dist * 16)}px` }}
                />
              );
            })}
          </div>

          <div className="foot5__grid">
            <div className="foot5__brand">
              <img src="/assets/logo-amazing-donuts.webp" alt="Amazing Donuts" />
              <p>
                A nut-free, kosher pareve bakery on Bathurst Street since 1997. Everything is
                mixed, fried and finished on site the morning you buy it.
              </p>
              <div className="foot5__icons">
                {[Donut, Cookie, Croissant, CakeSlice].map((Icon, i) => (
                  <span key={i}>
                    <Icon strokeWidth={1.75} />
                  </span>
                ))}
              </div>
            </div>

            <div className="foot5__cols">
              {COLUMNS.map((col) => (
                <div key={col.title}>
                  <h3>{col.title}</h3>
                  <ul>
                    {col.links.map(([label, href]) => (
                      <li key={label}>
                        <a href={href}>{label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="foot5__base">
          <span>© {new Date().getFullYear()} Amazing Donuts · 3499 Bathurst Street, Toronto</span>
          <span>Certified kosher by COR 483 — pareve, Pas Yisroel, Kemach Yoshon.</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer5;
