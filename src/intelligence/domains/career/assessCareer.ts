import {
  assessFreshness,
  scaleAttribute,
  type CanonicalRecord,
  type ObservationRecord,
  type SkillClaimRecord,
} from '../../../domain/records';
import {
  LADDER_LABELS,
  barrierIdFor,
  rungFor,
  rungIndex,
  type LadderRung,
  type StudyBarrierId,
} from '../../../domain/career/ladder';
import { currentObservations, currentOfType } from '../../support';
import { isWorkWin } from '../captureRouting';
import type { FreshnessStatus } from '../../types';

/**
 * Reading the career evidence (Prompt 8C tasks 1–8).
 *
 * A read over the shared canonical records, like every domain. The interesting part is
 * what it computes rather than stores: **the rung a claim has earned**.
 *
 * ## Claimed versus supported
 *
 * The owner writes down what they would say in an interview. This module works out what
 * the evidence would back up. The gap between those two numbers is the most useful
 * output of the whole slice, and it only exists because the claim record deliberately
 * contains no assertion that it is true.
 *
 * Nothing here can raise a rung. Evidence raises rungs; this counts evidence.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const STUDY_FRESH_MS = 10 * DAY_MS;

export interface ClaimAssessment {
  readonly claim: SkillClaimRecord;
  /** What the evidence supports. Never what the owner asserted. */
  readonly earnedRung: LadderRung;
  readonly earnedRungLabel: string;
  readonly supportingCount: number;
  /** True when nothing at all backs it up. Normal for a new claim, not a failure. */
  readonly unsupported: boolean;
  /** How recent the newest supporting record is. */
  readonly freshness: FreshnessStatus;
  /** What would move it up one rung, stated concretely. */
  readonly nextProof: string;
}

export interface StudySession {
  readonly at: string;
  readonly topic: string | undefined;
  readonly independence: string | undefined;
  readonly retrieval: number | undefined;
}

export interface CareerEvidence {
  /** The owner's own words for what to do next, when they have written them down. */
  readonly nextStep: { readonly text: string; readonly freshness: FreshnessStatus } | undefined;
  readonly studiedRecently: boolean;
  readonly sessions: readonly StudySession[];
  readonly sessionsThisWeek: number;
  /** Barriers by taxonomy id, most frequent first. */
  readonly barriers: readonly { readonly id: StudyBarrierId; readonly count: number }[];
  /** An interrupted session that was never returned to. */
  readonly openInterruption: boolean;
  readonly retrievalTrend: readonly {
    readonly label: string;
    readonly value: number | null;
  }[];
  readonly claims: readonly ClaimAssessment[];
  readonly workWins: readonly ObservationRecord[];
  readonly observationCount: number;
  readonly anyEvidence: boolean;
}

/* -------------------------------------------------------------------------- */

function latest(
  observations: readonly ObservationRecord[],
  attribute: string,
): ObservationRecord | undefined {
  return observations
    .filter((observation) => observation.attribute === attribute)
    .reduce<ObservationRecord | undefined>(
      (newest, observation) =>
        newest === undefined || observation.occurredAt > newest.occurredAt
          ? observation
          : newest,
      undefined,
    );
}

function textOf(observation: ObservationRecord | undefined): string | undefined {
  if (observation === undefined) return undefined;
  if (observation.value.kind === 'note') return observation.value.text;
  if (observation.value.kind === 'state') return observation.value.state;
  return undefined;
}

/**
 * What would move a claim up one rung, in concrete terms.
 *
 * Never "study more". A rung is defined by a specific kind of evidence, so the next
 * step is that kind of evidence — which is also what makes the ladder useful rather
 * than motivational.
 */
function nextProofFor(rung: LadderRung): string {
  switch (rung) {
    case 'not-started':
      return 'One study session on this topic would put something behind it';
    case 'read-about-it':
      return 'A lab or exercise, even following a guide, would be the next piece';
    case 'followed-a-guide':
      return 'Doing it again with the documentation to hand rather than step-by-step';
    case 'did-it-with-help':
      return 'Doing it once without following anything';
    case 'did-it-alone':
      return 'Using it in real work, captured as a Work Win';
    case 'used-it-for-real':
      return 'Nothing further — this is as supported as the ladder goes';
  }
}

/* -------------------------------------------------------------------------- */

/**
 * The rung a claim has earned.
 *
 * Counts only records the claim actually cites. A study session on another topic does
 * not raise this claim, however diligent it was — which is the difference between an
 * evidence ladder and an activity tracker.
 */
export function assessClaim(
  claim: SkillClaimRecord,
  records: readonly CanonicalRecord[],
  now: Date,
): ClaimAssessment {
  const cited = new Set(claim.supportingRecordIds);
  const supporting = records.filter((record) => cited.has(record.recordId));

  const observations = supporting.filter(
    (record): record is ObservationRecord => record.recordType === 'observation',
  );

  const independence = observations.filter(
    (observation) => observation.attribute === 'career:lab-independence',
  );
  const independenceValue = (needle: string): number =>
    independence.filter(
      (observation) => observation.value.kind === 'state' && observation.value.state === needle,
    ).length;

  const earnedRung = rungFor({
    studySessions: observations.filter(
      (observation) => observation.attribute === 'career:studied',
    ).length,
    guidedLabs: independenceValue('Followed a guide'),
    assistedLabs: independenceValue('Needed help part way'),
    independentLabs: independenceValue('Did it on my own'),
    realWorkWins: observations.filter(isWorkWin).length,
  });

  const newest = supporting
    .map((record) => record.recordedAt)
    .sort()
    .at(-1);

  return {
    claim,
    earnedRung,
    earnedRungLabel: LADDER_LABELS[earnedRung],
    supportingCount: supporting.length,
    unsupported: supporting.length === 0,
    freshness: newest === undefined ? 'none' : assessFreshness(newest, now, 90 * DAY_MS).status,
    nextProof: nextProofFor(earnedRung),
  };
}

/* -------------------------------------------------------------------------- */

export function assessCareer(records: readonly CanonicalRecord[], now: Date): CareerEvidence {
  const observations = currentObservations(records).filter(
    (observation) =>
      observation.attribute.startsWith('career:') ||
      observation.attribute === scaleAttribute('retrieval-strength') ||
      isWorkWin(observation),
  );

  const nextStepRecord = latest(observations, 'career:next-step');
  const nextStepText = textOf(nextStepRecord);

  const studied = observations.filter(
    (observation) => observation.attribute === 'career:studied',
  );
  const studiedRecently = studied.some(
    (observation) =>
      observation.value.kind === 'state' &&
      observation.value.state === 'Yes' &&
      now.getTime() - Date.parse(observation.occurredAt) < STUDY_FRESH_MS,
  );

  /* Sessions, newest first. --------------------------------------------------- */
  const sessions: StudySession[] = studied
    .filter(
      (observation) => observation.value.kind === 'state' && observation.value.state === 'Yes',
    )
    .map((observation) => {
      const near = (attribute: string): ObservationRecord | undefined =>
        observations.find(
          (other) =>
            other.attribute === attribute &&
            Math.abs(Date.parse(other.occurredAt) - Date.parse(observation.occurredAt)) <
              60 * 60 * 1000,
        );
      const retrieval = near(scaleAttribute('retrieval-strength'));
      return {
        at: observation.occurredAt,
        topic: textOf(near('career:topic')),
        independence: textOf(near('career:lab-independence')),
        retrieval:
          retrieval?.value.kind === 'anchored-scale' ? retrieval.value.ordinal : undefined,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  /* Barriers, by taxonomy id. ------------------------------------------------- */
  const barrierCounts = new Map<StudyBarrierId, number>();
  for (const observation of observations) {
    if (observation.attribute !== 'career:barrier') continue;
    const label = textOf(observation);
    const id = label === undefined ? undefined : barrierIdFor(label);
    if (id === undefined) continue;
    barrierCounts.set(id, (barrierCounts.get(id) ?? 0) + 1);
  }

  /* An interruption nobody came back from. ------------------------------------ */
  const reEntry = latest(observations, 'career:re-entry');
  const openInterruption =
    reEntry?.value.kind === 'state' &&
    reEntry.value.state === 'No' &&
    now.getTime() - Date.parse(reEntry.occurredAt) < 7 * DAY_MS;

  /* Retrieval over the last eight weeks. -------------------------------------- */
  const retrievalTrend = Array.from({ length: 8 }, (_, index) => {
    const end = now.getTime() - (7 - index) * 7 * DAY_MS;
    const start = end - 7 * DAY_MS;
    const inWeek = observations.filter(
      (observation) =>
        observation.attribute === scaleAttribute('retrieval-strength') &&
        observation.value.kind === 'anchored-scale' &&
        Date.parse(observation.occurredAt) >= start &&
        Date.parse(observation.occurredAt) < end,
    );
    const value =
      inWeek.length === 0
        ? null
        : Math.round(
            (inWeek.reduce(
              (sum, observation) =>
                sum +
                (observation.value.kind === 'anchored-scale' ? observation.value.ordinal : 0),
              0,
            ) /
              inWeek.length) *
              10,
          ) / 10;
    return { label: `w${String(index + 1)}`, value };
  });

  const claims = currentOfType<SkillClaimRecord>(records, 'skill-claim')
    .filter((claim) => claim.state === 'active')
    .map((claim) => assessClaim(claim, records, now))
    // Weakest first: the gap is what this domain is for.
    .sort((a, b) => rungIndex(a.earnedRung) - rungIndex(b.earnedRung));

  return {
    nextStep:
      nextStepText === undefined || nextStepRecord === undefined
        ? undefined
        : {
            text: nextStepText,
            freshness: assessFreshness(nextStepRecord.recordedAt, now, 14 * DAY_MS).status,
          },
    studiedRecently,
    sessions,
    sessionsThisWeek: sessions.filter(
      (session) => now.getTime() - Date.parse(session.at) < 7 * DAY_MS,
    ).length,
    barriers: [...barrierCounts.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count),
    openInterruption,
    retrievalTrend,
    claims,
    workWins: observations.filter(isWorkWin),
    observationCount: observations.length,
    anyEvidence: observations.length > 0 || claims.length > 0,
  };
}
