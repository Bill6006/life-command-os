import type { CanonicalRecord } from '../../domain/records';
import type { SituationalCapacity } from '../../domain/domains/capacity';
import { localDayKey, localParts, timeBlockAt } from '../../domain/time/localTime';

/**
 * What the situation usually is at this hour on this day (`V33-028`, clarification 11).
 *
 * ## Predictive, never binding
 *
 * If the owner has been at work every Monday morning for six weeks, Monday morning is a
 * reasonable *guess*. It is not a fact, and the difference matters more than it sounds:
 * the day they work from home is exactly the day a pattern-as-fact would silently delete
 * every move it had learned to suppress — and it would do so invisibly, because the app
 * would believe it already knew where they were.
 *
 * So a prior is returned separately from the observed situation and is **never passed to
 * `fits`**. Eligibility is decided only by what the owner has actually said. A prior may:
 *
 *   - choose which `Can't now` reasons are worth offering first;
 *   - order otherwise-equal candidates;
 *   - decide whether a question is worth asking at all.
 *
 * It may not remove a move, and there is no code path by which it can, because the
 * function that removes moves does not receive it.
 *
 * ## Fresh explicit context wins immediately
 *
 * Not gradually, and not on a tie-break. `assessState` reads today's observations into
 * `situation`; this reads history into `situationPrior`. Anything in the first is the
 * answer. The prior only ever describes fields the owner has not spoken to today.
 *
 * ## Why a pattern never becomes a prohibition
 *
 * There is no branch here that writes anything, and nothing downstream promotes a prior
 * into an observation. A recurring pattern can only ever become a standing rule if the
 * owner sets one deliberately, through the permission and preference surfaces that
 * already exist for exactly that purpose.
 */

/** Below this many matching past days, the pattern is a coincidence. */
export const MINIMUM_OCCURRENCES = 3;

/** The share of matching days that must agree before a value is worth guessing from. */
export const AGREEMENT_THRESHOLD = 0.7;

export interface SituationPrior {
  /** What the situation usually is. Every field independently absent. */
  readonly usually: SituationalCapacity;
  /** How many comparable past days this rests on. */
  readonly fromDays: number;
  /** Stated per field, so a trace can quote the actual basis rather than assert one. */
  readonly because: readonly string[];
}

const EMPTY: SituationPrior = { usually: {}, fromDays: 0, because: [] };

const SETTINGS: Record<string, NonNullable<SituationalCapacity['setting']>> = {
  Home: 'home',
  Work: 'work',
  'Out and about': 'out',
  Travelling: 'travelling',
  'Somewhere else': 'other',
};

const ENGAGEMENTS: Record<string, NonNullable<SituationalCapacity['engagement']>> = {
  'Nothing in particular': 'free',
  Working: 'working',
  'With family': 'with-family',
  Eating: 'eating',
  Travelling: 'travelling',
  'Winding down': 'winding-down',
};

const INTERRUPTIBILITY: Record<string, NonNullable<SituationalCapacity['interruptibility']>> = {
  'Yes, freely': 'free',
  Briefly: 'brief',
  'Not right now': 'none',
};

const PRIVACY: Record<string, NonNullable<SituationalCapacity['privacy']>> = {
  Yes: 'private',
  'Only quietly': 'semi-private',
  'No — around other people': 'public',
};

interface Past {
  readonly attribute: string;
  readonly state: string;
  readonly dayKey: string;
}

/**
 * Past situation reports from the same weekday and time block as now.
 *
 * Weekday and block together, because "Monday" and "the morning" are each too coarse
 * alone — a Monday evening tells you very little about a Monday morning.
 */
function comparable(records: readonly CanonicalRecord[], now: Date, timeZone?: string): Past[] {
  const weekday = localParts(now, timeZone).weekday;
  const block = timeBlockAt(now, timeZone);
  const today = localDayKey(now, timeZone);

  const out: Past[] = [];
  for (const record of records) {
    if (record.recordType !== 'observation') continue;

    const attribute = (record as unknown as { attribute: string }).attribute;
    if (!attribute.startsWith('context:')) continue;

    const value = (record as unknown as { value: { kind?: string; state?: string } }).value;
    if (value.kind !== 'state' || value.state === undefined) continue;

    const at = new Date(record.occurredAt);
    if (Number.isNaN(at.getTime())) continue;

    const dayKey = localDayKey(at, timeZone);
    /* Today is evidence, not history. Including it would let a prior confirm itself. */
    if (dayKey === today) continue;
    if (localParts(at, timeZone).weekday !== weekday) continue;
    if (timeBlockAt(at, timeZone) !== block) continue;

    out.push({ attribute, state: value.state, dayKey });
  }
  return out;
}

/** The value that dominates, if one does, alongside how many days agreed. */
function dominant(
  past: readonly Past[],
  attribute: string,
): { readonly state: string; readonly agreed: number; readonly total: number } | undefined {
  /* One vote per day, so six reports on one unusual Monday cannot outvote six Mondays. */
  const perDay = new Map<string, string>();
  for (const entry of past) {
    if (entry.attribute !== attribute) continue;
    perDay.set(entry.dayKey, entry.state);
  }

  const total = perDay.size;
  if (total < MINIMUM_OCCURRENCES) return undefined;

  const counts = new Map<string, number>();
  for (const state of perDay.values()) counts.set(state, (counts.get(state) ?? 0) + 1);

  let best: { state: string; agreed: number } | undefined;
  for (const [state, agreed] of counts) {
    if (best === undefined || agreed > best.agreed) best = { state, agreed };
  }
  if (best === undefined) return undefined;
  if (best.agreed / total < AGREEMENT_THRESHOLD) return undefined;

  return { state: best.state, agreed: best.agreed, total };
}

export function inferSituationPrior(
  records: readonly CanonicalRecord[],
  now: Date,
  timeZone?: string,
): SituationPrior {
  const past = comparable(records, now, timeZone);
  if (past.length === 0) return EMPTY;

  const usually: {
    setting?: SituationalCapacity['setting'];
    engagement?: SituationalCapacity['engagement'];
    interruptibility?: SituationalCapacity['interruptibility'];
    privacy?: SituationalCapacity['privacy'];
  } = {};
  const because: string[] = [];
  const days = new Set(past.map((entry) => entry.dayKey));

  const fields = [
    { attribute: 'context:setting', map: SETTINGS, key: 'setting' },
    { attribute: 'context:engagement', map: ENGAGEMENTS, key: 'engagement' },
    { attribute: 'context:interruptibility', map: INTERRUPTIBILITY, key: 'interruptibility' },
    { attribute: 'context:privacy', map: PRIVACY, key: 'privacy' },
  ] as const;

  for (const field of fields) {
    const found = dominant(past, field.attribute);
    if (found === undefined) continue;
    const mapped = (field.map as Record<string, string>)[found.state];
    if (mapped === undefined) continue;

    Object.assign(usually, { [field.key]: mapped });
    because.push(
      `${found.state} on ${String(found.agreed)} of the last ${String(found.total)} comparable days`,
    );
  }

  return { usually, fromDays: days.size, because };
}

/**
 * What the app should assume for one field, and whether it actually knows it.
 *
 * The only sanctioned way to read a prior. It returns the source alongside the value so a
 * caller physically cannot lose track of which it is holding — an `assumed` value that
 * reaches an eligibility filter is a bug the type makes visible at the call site.
 */
export function expected<K extends keyof SituationalCapacity>(
  observed: SituationalCapacity,
  prior: SituationPrior,
  field: K,
): {
  readonly value: SituationalCapacity[K];
  readonly source: 'observed' | 'assumed' | 'none';
} {
  const said = observed[field];
  if (said !== undefined) return { value: said, source: 'observed' };

  const guess = prior.usually[field];
  if (guess !== undefined) return { value: guess, source: 'assumed' };

  return { value: undefined, source: 'none' };
}
