/* Content for the Build-a-Box and Jackpot Donut Slot modules.
   Straight from the interface handoff — ids, prices, art and colour families. */

export const FLAVOURS = [
  { id: "zap", name: "Zap Donut", price: 2.0, img: "donut-zap.png", family: "sky" },
  { id: "barbie", name: "Barbie Donut", price: 2.0, img: "donut-barbie.png", family: "magenta" },
  { id: "glazed", name: "Glazed Donut", price: 2.0, img: "donut-glazed.png", family: "sunshine" },
  { id: "choc", name: "Chocolate Glazed", price: 2.0, img: "donut-chocolate-glazed.png", family: "sunshine" },
  { id: "twist", name: "Cinnamon Twist", price: 2.5, img: "donut-cinnamon-twist.png", family: "sky" },
  { id: "petite", name: "Petite, 3-Pack", price: 2.25, img: "donut-petite-bulk.png", family: "magenta" },
  { id: "heart", name: "Heart Shape", price: 3.0, img: "donut-heart-shape.png", family: "magenta" },
  { id: "star", name: "Star of David", price: 3.0, img: "donut-star-of-david.png", family: "sky" },
  { id: "custom", name: "Customizable", price: 3.0, img: "donut-customizable.png", family: "sunshine" }
];

export const art = (flavour) => `/assets/redesign/${flavour.img}`;

export const flavourById = (id) => FLAVOURS.find((f) => f.id === id);

export const QUOTES = [
  ["The glaze, Watson, is never merely a glaze.", "Shernut Holmes"],
  ["The little grey cells run on sugar. Bring two.", "Cronut Poirot"],
  ["I will carry the donut to the counter, though I do not know the way.", "Frodough Baggins"],
  ["It belongs in a box. Preferably mine.", "Indiana Jelly"],
  ["Chocolate glazed. I will take every last one.", "Cruller de Vil"],
  ["I painted the stars and still thought about the twist.", "Vincent van Dough"],
  ["Let them eat the whole dozen.", "Marie Antoinut"],
  ["A donut is a circle with no bad decisions in it.", "Sprinkleodore Roosevelt"]
];

export const COMPLIMENTS = [
  "That is a beautiful dozen.",
  "Excellent taste, honestly.",
  "The bakery approves of this box.",
  "Not one wrong choice in there.",
  "Somebody knows what they like.",
  "This box is going to make a room happy.",
  "Bold picks. We respect it."
];

/** Status copy for the box, by fill ratio. */
export function boxNote(count, limit, closed) {
  if (closed && count >= limit) return "Lid down, tape on. Say the word and it is at the counter.";
  if (count === 0) return `${limit} empty slots. Start anywhere.`;
  const ratio = count / limit;
  if (ratio < 0.4) return "A start. Keep going, the box is patient.";
  if (ratio < 0.75) return "Halfway. This is where people get ambitious.";
  if (ratio < 1) return "Nearly a dozen. One more decision.";
  return "Full box. Close the lid, or keep swapping flavours.";
}

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
