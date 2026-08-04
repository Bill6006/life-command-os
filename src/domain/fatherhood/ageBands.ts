/**
 * Which part of the map is currently relevant, chosen by the owner.
 *
 * ## No birth date, on purpose
 *
 * A date of birth is the most identifying thing this application could hold about a
 * child. It would have to be protected for the rest of her life, it would appear in
 * every backup and every export decision, and it buys nothing the owner cannot say in
 * one tap. So he picks a band, and changes it when it stops fitting.
 *
 * ## Changing a band adds; it never removes
 *
 * A skill that leaves the current band becomes **history**, not a gap and not a failure.
 * Everything recorded against it stays exactly where it was, stays visible, and stays
 * readable — the band decides what is *newly worth looking at*, never what is true.
 */

export const AGE_BANDS = [
  'around-12-18-months',
  'around-18-24-months',
  'around-2-3-years',
  'around-3-4-years',
  'around-4-5-years',
] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  'around-12-18-months': 'Around 12–18 months',
  'around-18-24-months': 'Around 18–24 months',
  'around-2-3-years': 'Around 2–3 years',
  'around-3-4-years': 'Around 3–4 years',
  'around-4-5-years': 'Around 4–5 years',
};

export function ageBandIndex(band: AgeBand): number {
  return AGE_BANDS.indexOf(band);
}

export function isAgeBand(value: unknown): value is AgeBand {
  return typeof value === 'string' && (AGE_BANDS as readonly string[]).includes(value);
}

export function ageBandFromLabel(label: string): AgeBand | undefined {
  return AGE_BANDS.find((band) => AGE_BAND_LABELS[band] === label);
}

/**
 * The band assumed until the owner says otherwise.
 *
 * A default has to exist so the map is useful on first opening. It is a starting point
 * offered for one tap of correction, never an inference about the child.
 */
export const DEFAULT_AGE_BAND: AgeBand = 'around-2-3-years';

/** Where the owner's choice is recorded. Ordinary `child`-classified observation. */
export const AGE_BAND_ATTRIBUTE = 'father:age-band';
