import type { CanonicalRecord, ObservationRecord } from '../../../domain/records';
import { assessFreshness } from '../../../domain/records';
import {
  ENVIRONMENT_PURPOSES,
  FRICTION_KINDS,
  HOME_ATTRIBUTES,
  NOTHING_IN_THE_WAY,
  frictionKindByLabel,
  purposeOfAttribute,
  type FrictionKindId,
} from '../../../domain/home/environment';
import { currentObservations } from '../../support';
import type { FreshnessStatus } from '../../types';

/**
 * Reading the environment evidence (Prompt 8G).
 *
 * ## Repetition is the whole reading
 *
 * A friction recorded once is an event. A friction recorded three times is a property of
 * the setup, and only the second thing is worth acting on. Everything below exists to
 * tell those apart, and the domain is deliberately silent about the first — a suggestion
 * after one bad morning is how a decision tool becomes a chore list.
 *
 * ## The gap that is not a zero
 *
 * A week with home observations and no friction is a **zero**: he was recording, and
 * nothing got in the way. A week with no home observations at all is a **gap**: nothing is
 * known about it. Collapsing the two would draw a chart showing friction falling away
 * every time he stopped using the app, which is the most flattering possible lie.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const FORTNIGHT_MS = 14 * DAY_MS;
const FRICTION_FRESH_MS = 14 * DAY_MS;
const WEEKS_SHOWN = 6;

export interface FrictionReading {
  readonly kindId: FrictionKindId;
  readonly label: string;
  /** Occasions recorded, all time. A count of events, never a rate. */
  readonly occasions: number;
  readonly lastAt: string | undefined;
  readonly freshness: FreshnessStatus | undefined;
  /** What he was trying to do, where he said. Empty when it was never recorded. */
  readonly purposes: readonly string[];
}

export interface HomeEvidence {
  readonly anyEvidence: boolean;
  /** Most recorded first. Not a ranking of anything about him. */
  readonly frictions: readonly FrictionReading[];
  /** Recorded more than once. The only kind this domain acts on. */
  readonly repeated: readonly FrictionReading[];
  readonly totalFrictions: number;
  /** `null` is a week with nothing recorded at all, and is never plotted as zero. */
  readonly weeklyCounts: readonly { readonly label: string; readonly value: number | null }[];
  readonly recentCount: number;
  readonly priorCount: number;
  /** A change he named and has not made. */
  readonly openChange: string | undefined;
  /** The newest change he named, whatever became of it. */
  readonly changeStatement: string | undefined;
  readonly changeMade: boolean;
  readonly changeMadeAt: string | undefined;
  /** Whether the same thing came back. The only measure of success here. */
  readonly frictionSince: string | undefined;
  readonly conditions: string | undefined;
  readonly access: string | undefined;
  readonly setupTime: string | undefined;
  readonly transition: string | undefined;
  readonly noteCount: number;
  readonly observationCount: number;
}

function stateText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'state' ? observation.value.state : undefined;
}

function noteText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'note' ? observation.value.text : undefined;
}

const PURPOSE_LABELS = new Map(
  ENVIRONMENT_PURPOSES.map((purpose) => [purpose.id, purpose.label]),
);

export function assessHome(records: readonly CanonicalRecord[], now: Date): HomeEvidence {
  const observations = currentObservations(records);

  const homeObservations = observations
    .filter((observation) => observation.attribute.startsWith('home:'))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const newestState = (attribute: string): string | undefined => {
    const found = homeObservations.find((observation) => observation.attribute === attribute);
    return found === undefined ? undefined : stateText(found);
  };

  /*
   * Friction is recorded under `home:friction` from a guide and
   * `home:friction:<purpose>` from the area page, which knows what he was doing. The
   * bare form is not given a default purpose — unknown stays unknown.
   */
  const frictionObservations = homeObservations.filter(
    (observation) =>
      observation.attribute === HOME_ATTRIBUTES.friction ||
      observation.attribute.startsWith(`${HOME_ATTRIBUTES.friction}:`),
  );
  const recorded = frictionObservations.filter(
    (observation) => stateText(observation) !== NOTHING_IN_THE_WAY,
  );

  const frictions: FrictionReading[] = FRICTION_KINDS.map((kind) => {
    const matching = recorded.filter(
      (observation) => frictionKindByLabel(stateText(observation) ?? '')?.id === kind.id,
    );
    const lastAt = matching[0]?.occurredAt;
    const purposes = [
      ...new Set(
        matching.flatMap((observation) => {
          const purpose = purposeOfAttribute(observation.attribute);
          const label = purpose === undefined ? undefined : PURPOSE_LABELS.get(purpose);
          return label === undefined ? [] : [label];
        }),
      ),
    ];

    return {
      kindId: kind.id,
      label: kind.label,
      occasions: matching.length,
      lastAt,
      freshness:
        lastAt === undefined
          ? undefined
          : assessFreshness(lastAt, now, FRICTION_FRESH_MS).status,
      purposes,
    };
  })
    .filter((reading) => reading.occasions > 0)
    .sort((a, b) => b.occasions - a.occasions);

  /* --- weeks, with gaps kept as gaps -------------------------------------- */

  const weeklyCounts: { label: string; value: number | null }[] = [];
  for (let index = WEEKS_SHOWN - 1; index >= 0; index -= 1) {
    const end = now.getTime() - index * WEEK_MS;
    const start = end - WEEK_MS;
    const inWindow = (observation: ObservationRecord): boolean => {
      const at = Date.parse(observation.occurredAt);
      return at >= start && at < end;
    };

    const observedThatWeek = homeObservations.some(inWindow);
    weeklyCounts.push({
      label: index === 0 ? 'This week' : `${String(index)}w ago`,
      value: observedThatWeek ? recorded.filter(inWindow).length : null,
    });
  }

  const since = (ms: number, until: number): number =>
    recorded.filter((observation) => {
      const at = Date.parse(observation.occurredAt);
      return at >= now.getTime() - ms && at < now.getTime() - until;
    }).length;

  /* --- the one change ------------------------------------------------------ */

  const namedChanges = homeObservations.filter(
    (observation) => observation.attribute === HOME_ATTRIBUTES.changeNamed,
  );
  const changeStatement = namedChanges[0] === undefined ? undefined : noteText(namedChanges[0]);

  const madeAnswer = homeObservations.find(
    (observation) => observation.attribute === HOME_ATTRIBUTES.changeMade,
  );
  const madeState = madeAnswer === undefined ? undefined : stateText(madeAnswer);
  const changeMade = madeState === 'Yes' || madeState === 'Started it';

  const notes = homeObservations.filter(
    (observation) => observation.attribute === HOME_ATTRIBUTES.frictionNote,
  );

  return {
    anyEvidence: homeObservations.length > 0,
    frictions,
    repeated: frictions.filter((reading) => reading.occasions >= 2),
    totalFrictions: recorded.length,
    weeklyCounts,
    recentCount: since(FORTNIGHT_MS, 0),
    priorCount: since(2 * FORTNIGHT_MS, FORTNIGHT_MS),
    openChange: changeMade ? undefined : changeStatement,
    changeStatement,
    changeMade,
    changeMadeAt: changeMade ? madeAnswer?.occurredAt : undefined,
    frictionSince: newestState(HOME_ATTRIBUTES.frictionOutcome),
    conditions: newestState(HOME_ATTRIBUTES.conditions),
    access: newestState(HOME_ATTRIBUTES.access),
    setupTime: newestState(HOME_ATTRIBUTES.setupTime),
    transition: newestState(HOME_ATTRIBUTES.transition),
    noteCount: notes.length,
    observationCount: homeObservations.length,
  };
}
