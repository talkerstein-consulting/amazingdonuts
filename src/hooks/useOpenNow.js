import { useEffect, useState } from "react";

/* [open, close] in minutes past midnight, Sunday = 0. null = closed. */
const HOURS = [
  [8 * 60, 13 * 60],
  [7 * 60 + 30, 16 * 60],
  [7 * 60 + 30, 16 * 60],
  [7 * 60 + 30, 16 * 60],
  [7 * 60 + 30, 16 * 60],
  [7 * 60 + 30, 13 * 60],
  null
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const clock = (mins) => {
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${hh > 12 ? hh - 12 : hh}:${String(mm).padStart(2, "0")}${hh < 12 ? "am" : "pm"}`;
};

const torontoNow = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));

function state() {
  const t = torontoNow();
  const day = t.getDay();
  const mins = t.getHours() * 60 + t.getMinutes();
  const span = HOURS[day];
  const open = !!span && mins >= span[0] && mins < span[1];

  if (open && span[1] - mins <= 45) {
    return {
      family: "sunshine",
      label: "Closing soon",
      message: `${span[1] - mins} minutes left today. The case does not restock.`
    };
  }
  if (open) {
    return {
      family: "sky",
      label: "Open now",
      message: `Fryer on, counter staffed, until ${clock(span[1])}.`
    };
  }
  if (day === 6) {
    return {
      family: "magenta",
      label: "Closed for Shabbat",
      message: "Back Sunday at 8:00am."
    };
  }

  let next = null;
  let ahead = 0;
  for (let i = 1; i <= 7 && !next; i++) {
    const d = (day + i) % 7;
    if (HOURS[d]) {
      next = HOURS[d];
      ahead = i;
    }
  }
  const laterToday = !!span && mins < span[0];
  const when = laterToday ? "today" : ahead === 1 ? "tomorrow" : DAYS[(day + ahead) % 7];
  return {
    family: "magenta",
    label: "Closed",
    message: `Open ${when} at ${clock(laterToday ? span[0] : next[0])}.`
  };
}

/** The bakery's live open/closed state, re-checked every minute. */
export function useOpenNow() {
  const [now, setNow] = useState(state);

  useEffect(() => {
    const id = setInterval(() => setNow(state()), 60000);
    return () => clearInterval(id);
  }, []);

  return now;
}
