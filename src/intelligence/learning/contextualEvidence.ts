import type { CanonicalRecord, ExecutionRecord, OutcomeRecord } from '../../domain/records';
import { canonicalPatternId } from '../../domain/moves/registry';
import { outcomeWindows } from '../evaluation/outcomeWindows';

/**
 * What a move has been followed by, and in which situations (`V33-063`, v3.3 section G1).
 *
 * ## Not one number per move
 *
 * G1 is explicit that there must be no universal effectiveness score, and the reason is
 * not squeamishness about numbers — it is that a single figure cannot be true. A walk at
 * eleven in the morning and a walk at eleven at night are the same catalogue pattern and
 * different propositions. Averaging them produces a number that describes neither, and
 * describes it confidently.
 *
 * So evidence is held per **facet**: the pattern together with one named aspect of the
 * situation it happened in. A move can be well-supported in the evening and unsupported at
 * work, and both statements can be kept without duplicating the move definition
 * (`AT33-030`).
 *
 * ## Association, never cause
 *
 * Every statement this module produces is about co-occurrence. `often followed by`,
 * `tended to coincide with`, `mixed evidence`, `not enough yet`. There is no code path
 * here that can emit `caused`, `because of`, or `works` — G4, and the reason the sentences
 * are built from a fixed vocabulary rather than assembled freely.
 *
 * What this observes is that an outcome was recorded after a move in a given context. It
 * does not observe why, it cannot control for anything, and the owner never gets asked to
 * supply a cause.
 *
 * ## Sparse evidence is the normal case
 *
 * One observation is `insufficient`, and stays `insufficient` — a single good result must
 * not make a move look supported (`G6`, `AT33-035`). Nothing here reaches `consistent`
 * without a run of agreeing observations and no disagreement, and a single disagreement
 * moves a facet to `mixed` rather than dropping it. Mixed is a real finding; it is what
 * "we do not know yet" looks like when there is something to look at.
 */

/** Named aspects of a situation that evidence can be held against. */
export const FACET_KINDS = [
  'time-of-day',
  'setting',
  'interruptibility',
  'privacy',
  'capacity',
  'available-time',
  'bedtime-proximity',
  'weekly-direction',
] as const;
export type FacetKind = (typeof FACET_KINDS)[number];

export interface Facet {
  readonly kind: FacetKind;
  readonly value: string;
}

export type EvidenceStrength = 'insufficient' | 'emerging' | 'consistent' | 'mixed';

/** Agreeing observations needed before a facet says anything beyond "not enough yet". */
export const EMERGING_AT = 2;
/** Agreeing observations, with none disagreeing, before a facet reads as consistent. */
export const CONSISTENT_AT = 4;

export interface ContextualEvidence {
  readonly patternId: string;
  readonly facet: Facet;
  /** Resolved outcomes observed in this context. Unresolved ones are not counted. */
  readonly observed: number;
  readonly favourable: number;
  readonly unfavourable: number;
  readonly strength: EvidenceStrength;
  /** Association language, drawn from a fixed vocabulary. Never causal. */
  readonly statement: string;
}

/* -------------------------------------------------------------------------- */

/** Which part of the day an instant falls in, in the owner's own local time. */
export function timeOfDay(iso: string, offsetMinutes: number): string {
  const local = new Date(Date.parse(iso) + offsetMinutes * 60 * 1000);
  const hour = local.getUTCHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}

/** Coarse bands, because "23 minutes free" is not a situation anyone can learn about. */
export function minutesBand(minutes: number | undefined): string | undefined {
  if (minutes === undefined) return undefined;
  if (minutes < 15) return 'under-15';
  if (minutes < 45) return '15-45';
  return 'over-45';
}

/**
 * The facets one execution happened in.
 *
 * Only what was actually recorded. An unknown situation field contributes no facet at
 * all rather than a facet called `unknown` — evidence about "times we did not know where
 * he was" is not evidence about a situation, and would quietly become the largest bucket.
 */
export function facetsOf(context: {
  readonly at: string;
  readonly offsetMinutes: number;
  readonly setting?: string | undefined;
  readonly interruptibility?: string | undefined;
  readonly privacy?: string | undefined;
  readonly capacity?: string | undefined;
  readonly availableMinutes?: number | undefined;
  readonly minutesToBedtime?: number | undefined;
  readonly weeklyDirection?: string | undefined;
}): readonly Facet[] {
  const out: Facet[] = [
    { kind: 'time-of-day', value: timeOfDay(context.at, context.offsetMinutes) },
  ];

  if (context.setting !== undefined) out.push({ kind: 'setting', value: context.setting });
  if (context.interruptibility !== undefined) {
    out.push({ kind: 'interruptibility', value: context.interruptibility });
  }
  if (context.privacy !== undefined) out.push({ kind: 'privacy', value: context.privacy });
  if (context.capacity !== undefined) out.push({ kind: 'capacity', value: context.capacity });

  const band = minutesBand(context.availableMinutes);
  if (band !== undefined) out.push({ kind: 'available-time', value: band });

  if (context.minutesToBedtime !== undefined) {
    out.push({
      kind: 'bedtime-proximity',
      value: context.minutesToBedtime <= 60 ? 'within-an-hour' : 'later',
    });
  }
  if (context.weeklyDirection !== undefined) {
    out.push({ kind: 'weekly-direction', value: context.weeklyDirection });
  }

  return out;
}

/* -------------------------------------------------------------------------- */

function strengthOf(favourable: number, unfavourable: number): EvidenceStrength {
  if (favourable > 0 && unfavourable > 0) return 'mixed';
  const agreeing = Math.max(favourable, unfavourable);
  if (agreeing >= CONSISTENT_AT) return 'consistent';
  if (agreeing >= EMERGING_AT) return 'emerging';
  return 'insufficient';
}

/**
 * How a facet reads, in words.
 *
 * A fixed vocabulary rather than a template with a verb slot. There is deliberately no
 * branch that can produce a causal claim, so `AT33-033` is a property of the code and not
 * of anybody's care in writing copy.
 */
function statementFor(
  strength: EvidenceStrength,
  favourable: number,
  unfavourable: number,
  facet: Facet,
): string {
  const where = `${facet.kind.replace(/-/g, ' ')}: ${facet.value}`;

  switch (strength) {
    case 'consistent':
      return favourable >= unfavourable
        ? `Often followed by something better in similar situations (${where})`
        : `Often followed by no improvement in similar situations (${where})`;
    case 'emerging':
      return favourable >= unfavourable
        ? `Has tended to coincide with something better (${where})`
        : `Has tended to coincide with no change (${where})`;
    case 'mixed':
      return `Mixed evidence in similar situations (${where})`;
    default:
      return `Evidence is still limited (${where})`;
  }
}

/* -------------------------------------------------------------------------- */

export interface ResolvedExecution {
  readonly patternId: string;
  readonly facets: readonly Facet[];
  readonly favourable: boolean;
}

/**
 * Executions whose window has closed and which carry a known result.
 *
 * Everything else is dropped rather than counted as anything. An unresolved window is not
 * weak evidence of failure, an expired one is not evidence of anything at all, and a
 * declined recommendation is evidence about the moment, not about the move.
 */
export function resolvedExecutions(
  records: readonly CanonicalRecord[],
  now: Date,
): readonly ResolvedExecution[] {
  const patternByEpisode = new Map<string, string>();
  const contextByEpisode = new Map<string, readonly Facet[]>();

  for (const record of records) {
    if (record.recordType !== 'candidate-action') continue;
    if (record.decisionEpisodeId === undefined) continue;
    if (record.engineCandidateId === undefined) continue;
    patternByEpisode.set(
      record.decisionEpisodeId,
      canonicalPatternId(record.engineCandidateId),
    );
    contextByEpisode.set(
      record.decisionEpisodeId,
      facetsOf({ at: record.occurredAt, offsetMinutes: record.localTime.utcOffsetMinutes }),
    );
  }

  const executions = new Map(
    records
      .filter((record): record is ExecutionRecord => record.recordType === 'execution')
      .map((execution) => [execution.recordId, execution]),
  );

  const out: ResolvedExecution[] = [];

  for (const window of outcomeWindows(records, now)) {
    /* Only a closed window with a known result says anything (`AT33-032`). */
    if (window.state !== 'closed') continue;
    if (window.executionState !== 'executed') continue;

    const outcome: OutcomeRecord | undefined = window.outcome;
    if (outcome?.result.status !== 'known') continue;

    const execution = executions.get(window.executionRecordId);
    if (execution?.decisionEpisodeId === undefined) continue;

    const patternId = patternByEpisode.get(execution.decisionEpisodeId);
    if (patternId === undefined) continue;

    /* `mixed` and `unchanged` are real answers and count against, not as nothing. */
    out.push({
      patternId,
      facets: contextByEpisode.get(execution.decisionEpisodeId) ?? [],
      favourable: outcome.result.value.direction === 'improved',
    });
  }

  return out;
}

/**
 * The evidence index: every pattern, in every context it has actually been observed in.
 *
 * Facets with no observations are absent rather than present-and-empty, so nothing
 * downstream can mistake "never tried here" for "tried here and did nothing".
 */
export function contextualEvidence(
  records: readonly CanonicalRecord[],
  now: Date,
): readonly ContextualEvidence[] {
  const tally = new Map<
    string,
    { patternId: string; facet: Facet; favourable: number; unfavourable: number }
  >();

  for (const resolved of resolvedExecutions(records, now)) {
    for (const facet of resolved.facets) {
      const key = `${resolved.patternId}|${facet.kind}|${facet.value}`;
      const entry = tally.get(key) ?? {
        patternId: resolved.patternId,
        facet,
        favourable: 0,
        unfavourable: 0,
      };
      if (resolved.favourable) entry.favourable += 1;
      else entry.unfavourable += 1;
      tally.set(key, entry);
    }
  }

  return [...tally.values()]
    .map((entry) => {
      const strength = strengthOf(entry.favourable, entry.unfavourable);
      return {
        patternId: entry.patternId,
        facet: entry.facet,
        observed: entry.favourable + entry.unfavourable,
        favourable: entry.favourable,
        unfavourable: entry.unfavourable,
        strength,
        statement: statementFor(strength, entry.favourable, entry.unfavourable, entry.facet),
      };
    })
    .sort(
      (a, b) =>
        a.patternId.localeCompare(b.patternId) || a.facet.kind.localeCompare(b.facet.kind),
    );
}

/**
 * What the evidence says about this move *here*, for the arbiter.
 *
 * Returns `undefined` when nothing has been observed in any of the current facets, which
 * is the normal case and must stay distinguishable from "observed, and it did nothing".
 */
export function applicabilityIn(
  evidence: readonly ContextualEvidence[],
  patternId: string,
  facets: readonly Facet[],
): ContextualEvidence | undefined {
  const here = evidence.filter(
    (entry) =>
      entry.patternId === patternId &&
      facets.some(
        (facet) => facet.kind === entry.facet.kind && facet.value === entry.facet.value,
      ),
  );
  if (here.length === 0) return undefined;

  /*
   * The most-observed matching facet, and ties broken towards the more cautious reading.
   * Where two contexts disagree the arbiter should hear the disagreement, not the half of
   * it that happens to sort first.
   */
  const ranked = [...here].sort(
    (a, b) => b.observed - a.observed || (a.strength === 'mixed' ? -1 : 1),
  );
  return ranked[0];
}
