import type { CanonicalRecord, GoalRecord, ObservationRecord } from '../../../domain/records';
import { anchorLabel } from '../../../domain/records';
import { topicEnabled } from '../../../domain/emotional/permissions';
import {
  MONEY_ATTRIBUTES,
  NOT_LOOKED_RECENTLY,
  RESILIENCE_BANDS,
} from '../../../domain/money/strategy';
import { currentObservations, currentOfType } from '../../support';
import type { FreshnessStatus } from '../../types';

/**
 * Reading the money evidence (Prompt 8H).
 *
 * ## Two readings that move independently
 *
 * Pressure is how much money is on his mind. Resilience is how long he could cover
 * things. They are **not** the same fact and they routinely disagree: heavy pressure with
 * several months of cover is a bad week, and no pressure with under a week of cover is
 * fragility nobody has noticed yet. Keeping them apart is the most useful thing this
 * reading does, and it is why they are never combined into one number.
 *
 * ## Figures are absent by default and that changes nothing else
 *
 * `figuresEnabled` gates exactly one thing: whether a target and a current amount exist.
 * Every other field here is populated the same way with or without them, which is what
 * makes "the domain works fully without a single figure" a property of the code rather
 * than a claim in a document.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const WEEKS_SHOWN = 6;

export interface MoneyEvidence {
  readonly anyEvidence: boolean;
  /** Ordinal 1–5 on the shared scale, with its label. Never averaged with anything. */
  readonly pressure: { readonly ordinal: number; readonly label: string } | undefined;
  readonly pressureAt: string | undefined;
  /** `null` is a week with no reading, and is never plotted as zero. */
  readonly pressureByWeek: readonly {
    readonly label: string;
    readonly value: number | null;
  }[];
  /** Ordinal position on the resilience ladder, or undefined when never answered. */
  readonly resilienceIndex: number | undefined;
  readonly resilience: string | undefined;
  readonly lastLooked: string | undefined;
  readonly lastLookedAt: string | undefined;
  /** True only when he said so himself. Never inferred from silence. */
  readonly notLookingLately: boolean;
  readonly openDecision: string | undefined;
  readonly decisionStatement: string | undefined;
  readonly decisionMade: string | undefined;
  readonly decisionMadeAt: string | undefined;
  readonly pressureAtDecision: { readonly ordinal: number; readonly label: string } | undefined;
  readonly pressureSince: string | undefined;
  /** What the money is for, in his words. A goal, filed like every other goal. */
  readonly purpose: GoalRecord | undefined;
  readonly figuresEnabled: boolean;
  readonly goalTarget: number | undefined;
  readonly goalCurrent: number | undefined;
  readonly eventCount: number;
  readonly observationCount: number;
}

function stateText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'state' ? observation.value.state : undefined;
}

function noteText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'note' ? observation.value.text : undefined;
}

function amount(observation: ObservationRecord): number | undefined {
  return observation.value.kind === 'quantity' ? observation.value.amount : undefined;
}

function ordinalOf(
  observation: ObservationRecord,
): { ordinal: number; label: string } | undefined {
  if (observation.value.kind !== 'anchored-scale') return undefined;
  const label = anchorLabel(observation.value.scaleId, observation.value.ordinal);
  return label === undefined ? undefined : { ordinal: observation.value.ordinal, label };
}

export function assessMoney(records: readonly CanonicalRecord[], now: Date): MoneyEvidence {
  const observations = currentObservations(records);

  const moneyObservations = observations
    .filter(
      (observation) =>
        observation.attribute.startsWith('money:') ||
        observation.attribute === MONEY_ATTRIBUTES.pressure,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const of = (attribute: string): ObservationRecord[] =>
    moneyObservations.filter((observation) => observation.attribute === attribute);

  const newestState = (attribute: string): string | undefined => {
    const found = of(attribute)[0];
    return found === undefined ? undefined : stateText(found);
  };

  /* --- pressure ------------------------------------------------------------ */

  const pressureReadings = of(MONEY_ATTRIBUTES.pressure);
  const newestPressure = pressureReadings[0];

  const pressureByWeek: { label: string; value: number | null }[] = [];
  for (let index = WEEKS_SHOWN - 1; index >= 0; index -= 1) {
    const end = now.getTime() - index * WEEK_MS;
    const start = end - WEEK_MS;
    const inWindow = pressureReadings.filter((observation) => {
      const at = Date.parse(observation.occurredAt);
      return at >= start && at < end;
    });

    /*
     * The newest reading in the week, not an average of them. Averaging ordinals invents
     * a 2.5 that nobody ever reported and that no anchor describes.
     */
    const reading = inWindow[0] === undefined ? undefined : ordinalOf(inWindow[0]);
    pressureByWeek.push({
      label: index === 0 ? 'This week' : `${String(index)}w ago`,
      value: reading?.ordinal ?? null,
    });
  }

  /* --- resilience, as a position rather than a number ---------------------- */

  const resilience = newestState(MONEY_ATTRIBUTES.resilience);
  const resilienceIndex = RESILIENCE_BANDS.findIndex((band) => band === resilience);

  /* --- looking at it ------------------------------------------------------- */

  const lastLookedRecord = of(MONEY_ATTRIBUTES.lastLooked)[0];
  const lastLooked = lastLookedRecord === undefined ? undefined : stateText(lastLookedRecord);

  /* --- the decision he is weighing ----------------------------------------- */

  const namedDecisions = of(MONEY_ATTRIBUTES.decisionNamed);
  const decisionStatement =
    namedDecisions[0] === undefined ? undefined : noteText(namedDecisions[0]);
  const madeRecord = of(MONEY_ATTRIBUTES.decisionMade)[0];
  const decisionMade = madeRecord === undefined ? undefined : stateText(madeRecord);
  const settled = decisionMade === 'Did it' || decisionMade === 'Decided against it';

  /*
   * The pressure reading closest to when the decision was made, so the panel can put
   * "before" beside "now". It is a comparison of two moments and never a causal claim.
   */
  const decisionAt = madeRecord?.occurredAt;
  const beforeDecision =
    decisionAt === undefined
      ? undefined
      : pressureReadings
          .filter((observation) => observation.occurredAt <= decisionAt)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  /*
   * Explicitly undefined rather than `?? ({} as ObservationRecord)`. That cast shipped in
   * Prompt 8E and crashed reading `.value.kind` off an empty object — a cast that lies to
   * the compiler removes the one check that would have caught it.
   */
  const pressureAtDecision =
    beforeDecision === undefined ? undefined : ordinalOf(beforeDecision);

  /* --- what the money is for ----------------------------------------------- */

  const purpose = currentOfType<GoalRecord>(records, 'goal')
    .filter((goal) => goal.category === 'money' && goal.state === 'active')
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

  /* --- figures, only when separately switched on --------------------------- */

  const figuresEnabled = topicEnabled(records, 'money-figures');
  const targetRecord = of(MONEY_ATTRIBUTES.goalTarget)[0];
  const currentRecord = of(MONEY_ATTRIBUTES.goalCurrent)[0];

  return {
    anyEvidence: moneyObservations.length > 0 || purpose !== undefined,
    pressure: newestPressure === undefined ? undefined : ordinalOf(newestPressure),
    pressureAt: newestPressure?.occurredAt,
    pressureByWeek,
    resilienceIndex: resilienceIndex === -1 ? undefined : resilienceIndex,
    resilience,
    lastLooked,
    lastLookedAt: lastLookedRecord?.occurredAt,
    notLookingLately: lastLooked !== undefined && NOT_LOOKED_RECENTLY.includes(lastLooked),
    openDecision: settled ? undefined : decisionStatement,
    decisionStatement,
    decisionMade,
    decisionMadeAt: settled ? decisionAt : undefined,
    pressureAtDecision,
    pressureSince: newestState(MONEY_ATTRIBUTES.pressureSince),
    purpose,
    figuresEnabled,
    goalTarget: figuresEnabled && targetRecord !== undefined ? amount(targetRecord) : undefined,
    goalCurrent:
      figuresEnabled && currentRecord !== undefined ? amount(currentRecord) : undefined,
    eventCount: of(MONEY_ATTRIBUTES.event).length,
    observationCount: moneyObservations.length,
  };
}

/** Freshness of the domain's own readings, for the panel and the scan. */
export function moneyFreshness(evidence: MoneyEvidence): FreshnessStatus {
  return evidence.observationCount > 0 ? 'fresh' : 'none';
}
