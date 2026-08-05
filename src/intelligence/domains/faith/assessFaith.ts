import type {
  CanonicalRecord,
  FaithAnchorRecord,
  ObservationRecord,
} from '../../../domain/records';
import { assessFreshness } from '../../../domain/records';
import { FAITH_ATTRIBUTES, PRACTICE_OUTCOMES } from '../../../domain/faith/meaning';
import { currentObservations, currentOfType } from '../../support';
import type { FreshnessStatus } from '../../types';

/**
 * Reading the faith evidence (Prompt 8F).
 *
 * ## What it computes, and the one thing it refuses to
 *
 * It counts occasions: practices recorded, service done, repairs named and made. It never
 * computes adherence, consistency, or any ratio of done to intended — a practice the
 * owner set as "most days" and did twice this week produces the number two, not a
 * percentage and not a verdict.
 *
 * **Struggle is read but never interpreted.** It is surfaced so he can see what he wrote
 * and nothing else consults it: no branch of the candidate generator reads it, no
 * confidence calculation weighs it, and no condition sentence mentions it. Someone
 * writing down that this is hard should not cause an application to do anything.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const PRACTICE_FRESH_MS = 10 * DAY_MS;

export interface PracticeReading {
  readonly recordId: string;
  readonly statement: string;
  readonly state: 'active' | 'retired';
  /** Occasions recorded, all time. A count of events, never a rate. */
  readonly occasions: number;
  readonly lastAt: string | undefined;
  readonly freshness: FreshnessStatus | undefined;
  /** The value it serves, in his words, when he linked them. */
  readonly serves: string | undefined;
}

export interface FaithEvidence {
  readonly anyEvidence: boolean;
  /** His words, exactly as written. Never edited, never ranked. */
  readonly values: readonly FaithAnchorRecord[];
  readonly purpose: FaithAnchorRecord | undefined;
  readonly practices: readonly PracticeReading[];
  readonly activePractices: number;
  /** Practices with nothing recorded for a while. Not a failure; a fact. */
  readonly quietPractices: readonly PracticeReading[];
  readonly serviceCount: number;
  readonly lastServiceAt: string | undefined;
  readonly openRepair: string | undefined;
  readonly repairDone: boolean;
  /** Present so the owner can read it back. Nothing else reads this. */
  readonly struggleCount: number;
  readonly lastStruggleAt: string | undefined;
  readonly observationCount: number;
}

function noteText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'note' ? observation.value.text : undefined;
}

function stateText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'state' ? observation.value.state : undefined;
}

const DID_NOT_LABEL =
  PRACTICE_OUTCOMES.find((outcome) => outcome.id === 'did-not')?.label ?? 'Did not this time';

export function assessFaith(records: readonly CanonicalRecord[], now: Date): FaithEvidence {
  const observations = currentObservations(records);
  const byAttribute = (attribute: string): ObservationRecord[] =>
    observations
      .filter((observation) => observation.attribute === attribute)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  /** Practice occasions carry the practice's record id in their provenance. */
  const occasionsFor = (recordId: string): ObservationRecord[] =>
    [
      ...byAttribute(FAITH_ATTRIBUTES.practiceDone),
      ...byAttribute(FAITH_ATTRIBUTES.practiceHappened),
    ]
      .filter((record) => (record.provenance.derivedFromRecordIds ?? []).includes(recordId))
      .filter((record) => stateText(record) !== DID_NOT_LABEL)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const anchors = currentOfType<FaithAnchorRecord>(records, 'faith-anchor');
  const values = anchors.filter(
    (anchor) => anchor.kind === 'value' && anchor.state === 'active',
  );
  const purpose = anchors.find(
    (anchor) => anchor.kind === 'purpose' && anchor.state === 'active',
  );

  const byId = new Map(anchors.map((anchor) => [anchor.recordId, anchor]));

  const practices: PracticeReading[] = anchors
    .filter((anchor) => anchor.kind === 'practice')
    .map((anchor) => {
      const occasions = occasionsFor(anchor.recordId);
      const lastAt = occasions[0]?.occurredAt;
      return {
        recordId: anchor.recordId,
        statement: anchor.statement,
        state: anchor.state,
        occasions: occasions.length,
        lastAt,
        freshness:
          lastAt === undefined
            ? undefined
            : assessFreshness(lastAt, now, PRACTICE_FRESH_MS).status,
        serves:
          anchor.servesRecordId === undefined
            ? undefined
            : byId.get(anchor.servesRecordId)?.statement,
      };
    });

  const activePractices = practices.filter((practice) => practice.state === 'active');
  const quietPractices = activePractices.filter(
    (practice) => practice.freshness === undefined || practice.freshness === 'stale',
  );

  const service = byAttribute(FAITH_ATTRIBUTES.serviceHappened).filter(
    (record) => stateText(record) !== 'No',
  );

  const repairRecord = byAttribute(FAITH_ATTRIBUTES.repairNeeded)[0];
  const repairOutcomes = byAttribute(FAITH_ATTRIBUTES.repairHappened);
  const newestRepairOutcome = repairOutcomes[0];
  const repairDone =
    newestRepairOutcome !== undefined &&
    (stateText(newestRepairOutcome) === 'Yes' ||
      stateText(newestRepairOutcome) === 'Started it');

  const struggle = byAttribute(FAITH_ATTRIBUTES.struggle);

  const relevant = observations.filter((observation) =>
    observation.attribute.startsWith('faith:'),
  );

  return {
    anyEvidence: relevant.length > 0 || anchors.length > 0,
    values,
    purpose,
    practices,
    activePractices: activePractices.length,
    quietPractices,
    serviceCount: service.length,
    lastServiceAt: service[0]?.occurredAt,
    openRepair: repairRecord === undefined ? undefined : noteText(repairRecord),
    repairDone,
    struggleCount: struggle.length,
    lastStruggleAt: struggle[0]?.occurredAt,
    observationCount: relevant.length,
  };
}
