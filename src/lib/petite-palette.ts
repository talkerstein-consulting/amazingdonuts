import { ICINGS, SPRINKLES } from '../donut-lab-stable/builder-data';

/**
 * The colours a petite tray can be finished in, taken from the Donut Lab.
 *
 * The tray used to ask for its colours as free text — "Pink and white, school
 * colours, rainbow" — which is what the bakery's own form does. Free text is
 * honest about the range but it puts the whole burden on the customer to
 * describe something, and it lets them describe something the kitchen does not
 * stock. The lab already has the real lists, drawn as swatches, so the tray
 * uses those: the same eleven icings and the same sprinkle mixes, in the same
 * order, with the same names.
 *
 * `dots` is what gets drawn. An icing is one colour, a sprinkle mix is several,
 * so both are expressed as a list and the swatch renders however many it has.
 */
export type PetiteSwatch = { id: string; name: string; dots: string[] };

/** Sprinkle mixes, minus the bare "none" — a tray finished in sprinkles has
    sprinkles on it, so "no sprinkles" is not one of the answers. */
export const SPRINKLE_SWATCHES: PetiteSwatch[] = SPRINKLES.filter((s) => !s.bare).map((s) => ({
  id: s.id,
  name: s.name,
  dots: s.colors
}));

/** Icing colours, minus "No Icing" for the same reason, and minus any whose
    artwork carries no swatch of its own.

    "Plain Glazed" goes too, and for a reason of this tray's own: Glazed is one
    of the three donut types above, so offering it again as an icing *colour*
    asks the same question twice and lets the two answers contradict each
    other. In the lab it is a finish among finishes; here the finish has
    already been chosen. */
export const ICING_SWATCHES: PetiteSwatch[] = ICINGS.filter((i) => !i.bare && i.swatch && i.id !== 'glazed').map((i) => ({
  id: i.id,
  name: i.name,
  dots: [i.swatch as string]
}));

export const swatchesFor = (palette: 'sprinkle' | 'icing' | null): PetiteSwatch[] =>
  palette === 'sprinkle' ? SPRINKLE_SWATCHES : palette === 'icing' ? ICING_SWATCHES : [];

/**
 * Plain glazed, as an icing answer rather than a separate question.
 *
 * The tray used to ask one question — Sprinkle, Glazed, or Coloured icing —
 * which forced three different things through one control: two of them are
 * icings and the third is a topping. A donut can be glazed AND sprinkled, and
 * that combination was unorderable.
 *
 * Split in two, "glazed" is simply the icing you pick when you do not want a
 * colour, so it belongs in the icing list. Its dot is the glaze's own pale
 * cream rather than a colour swatch, because that is what it looks like.
 */
export const PLAIN_GLAZE: PetiteSwatch = { id: 'glazed', name: 'Plain glazed', dots: ['#FBF7F0'] };

/** Every icing answer: plain glaze first, then the colours. */
export const ICING_ANSWERS: PetiteSwatch[] = [PLAIN_GLAZE, ...ICING_SWATCHES];

/**
 * No sprinkles, as a sprinkle answer.
 *
 * On the old single question "no sprinkles" could not be said — Sprinkle was
 * the finish, so choosing it meant having them. As its own question it needs
 * an answer for the plain donut, and an empty one is not an answer: the
 * kitchen has to be told, not left to infer.
 */
export const NO_SPRINKLES: PetiteSwatch = { id: 'none', name: 'No sprinkles', dots: [] };

/** Every sprinkle answer: none first, then the mixes. */
export const SPRINKLE_ANSWERS: PetiteSwatch[] = [NO_SPRINKLES, ...SPRINKLE_SWATCHES];

/**
 * The sprinkle list a printed dozen picks from.
 *
 * The same mixes, plus the bare "No Sprinkles" the tray drops. On a petite tray
 * "no sprinkles" is not an answer, because Sprinkle is the finish you chose. On
 * a printed donut the print is the decoration and sprinkles over it are extra,
 * so declining them is a real choice — and one worth being able to make out
 * loud, rather than by leaving a field alone and hoping the counter reads the
 * blank the same way.
 */
export const PRINT_SPRINKLE_SWATCHES: PetiteSwatch[] = SPRINKLES.map((s) => ({
  id: s.id,
  name: s.bare ? 'No sprinkles' : s.name,
  dots: s.colors
}));
