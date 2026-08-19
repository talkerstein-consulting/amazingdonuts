"use client";

/**
 * React Bits Pro `contact-9`, rebuilt for Amazing Donuts.
 *
 * Kept from the block: the two-panel split — details and hours on the left,
 * a large visual panel on the right — plus the staggered entrance and the
 * pair of actions at the foot of the details panel.
 * Changed: the right panel is a Google map of the bakery instead of a photo
 * carousel, and the hours row highlights whichever day it is in Toronto.
 */

import { motion, useReducedMotion, type Variants } from "motion/react";
import { MapPin, Navigation, Phone } from "lucide-react";
import Wedge from "./Wedge.jsx";
import { useOpenNow } from "../hooks/useOpenNow.js";

const ADDRESS = "3499 Bathurst Street, Toronto, Ontario";
const MAP_SRC =
  "https://www.google.com/maps?q=" + encodeURIComponent(ADDRESS) + "&z=15&output=embed";
const DIRECTIONS =
  "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(ADDRESS);

const hours = [
  { days: "Sunday", time: "8:00am – 1:00pm", index: [0] },
  { days: "Monday – Thursday", time: "7:30am – 4:00pm", index: [1, 2, 3, 4] },
  { days: "Friday", time: "7:30am – 1:00pm", index: [5] },
  { days: "Saturday", time: "Closed", index: [6] }
];

const details = [
  { label: "The bakery", lines: ["3499 Bathurst Street", "Toronto, Ontario"] },
  { label: "Talk to us", lines: ["(416) 398-7546", "orders@amazingdonuts.com"] },
  { label: "Kashruth", lines: ["COR 483 · pareve", "Pas Yisroel · Kemach Yoshon"] },
  { label: "Allergens", lines: ["No tree nuts or peanuts", "No sesame, no dairy"] }
];

export default function Contact9() {
  const reduce = useReducedMotion();
  const now = useOpenNow();
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
  ).getDay();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.09 } }
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <section className="section" id="visit">
      <div className="wrap">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="contact9"
        >
          <motion.div variants={item} className="contact9__panel">
            <span className="contact9__badge">
              <MapPin /> Bathurst &amp; Fisherville
            </span>

            <h2 className="display">Nourishing Toronto, one bite at a time.</h2>
            <p className="lede">
              Street parking out front, a case that is fullest before noon, and no phone call
              needed unless you want a dozen of something specific.
            </p>

            <div className="contact9__grid">
              {details.map((d) => (
                <div key={d.label}>
                  <p className="contact9__label">{d.label}</p>
                  {d.lines.map((line) =>
                    line.includes("@") ? (
                      <p key={line}>
                        <a href={`mailto:${line}`}>{line}</a>
                      </p>
                    ) : /\d{3}\) /.test(line) ? (
                      <p key={line}>
                        <a href="tel:+14163987546">{line}</a>
                      </p>
                    ) : (
                      <p key={line}>{line}</p>
                    )
                  )}
                </div>
              ))}
            </div>

            <div className="contact9__hours">
              <div className="contact9__now">
                <span className="chip" data-family={now.family}>
                  <i className="chip__dot" />
                  <span className="chip__text">{now.label}</span>
                </span>
                <span className="now__msg">{now.message}</span>
              </div>
              {hours.map((row) => (
                <div key={row.days} className="contact9__row" data-today={row.index.includes(today)}>
                  <span>{row.days}</span>
                  <span>{row.time}</span>
                </div>
              ))}
            </div>

            <div className="contact9__acts">
              <Wedge label="Get Directions" href={DIRECTIONS} family="sky" biteBg="#E4F2FA" />
              <a className="contact9__call" href="tel:+14163987546">
                <Phone /> (416) 398-7546
              </a>
            </div>
          </motion.div>

          <motion.div variants={item} className="contact9__map">
            <iframe
              title="Map to Amazing Donuts, 3499 Bathurst Street, Toronto"
              src={MAP_SRC}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a className="contact9__maplink" href={DIRECTIONS} target="_blank" rel="noreferrer">
              <Navigation /> Open in Google Maps
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export { Contact9 };
