import type { CanonicalRecord, GoalRecord } from '../../domain/records';
import type { CandidateAction, RejectedCandidate } from '../../intelligence/types';

/**
 * The North Star eligibility gate (Phase 8 deliverable 1, master plan §2).
 *
 * > A global action must advance an active objective, restore required capability,
 * > remove a verified bottleneck, or protect a critical foundation.
 *
 * Four ways to qualify, and a candidate that meets none of them is **removed before
 * ranking** rather than scored lower. That distinction is the whole gate: a merely
 * plausible action with a large expected benefit would otherwise outscore a modest one
 * that actually serves the direction, and the owner would get a busy app rather than a
 * useful one.
 *
 * ## Why it does not require a North Star to exist
 *
 * When nothing has been recorded as the enduring direction, every candidate passes. The
 * alternative — silence until a North Star is written — would make a fresh profile
 * useless and would pressure somebody into declaring a life goal to get past a screen.
 * The gate reports that it abstained, which is honest, rather than pretending to have
 * applied a standard it had nothing to apply.
 *
 * ## Why capability restoration counts, and counts broadly
 *
 * The Constitution is explicit that this is not a productivity tool. An action that
 * restores a capability advances the direction precisely by making the rest possible, so
 * any declared `improves` effect qualifies on its own.
 *
 * The first version of this gate restricted that to three "foundation" channels — energy,
 * focus, regulation — and the effect was to ban five of the seven domains from Now
 * outright, because environmental ease, financial resilience, connection, and values
 * alignment are not on that list. Every one of them is a capability in this product's own
 * model. A gate about serving the direction that silently removed most of the product was
 * a bug wearing the clothes of rigour, and it is the reason `everyDomainCanReachNow` exists
 * in the test suite.
 *
 * ## What it therefore removes, and what it is actually for
 *
 * With four routes this wide, a hand-authored candidate almost always qualifies. What it
 * removes is a candidate that can say **nothing** about what it serves: no objective, no
 * capability improved, no bottleneck named, no foundation protected. That is a real class
 * — an action generated from a template, or one whose effects were left empty — and it is
 * exactly the class that should never reach a person.
 *
 * The gate's second job is the one that pays off daily: every survivor carries **which**
 * route it qualified on, so the trace can say "this is here because it restores focus"
 * rather than "this scored highest". That labelling is why the verdicts are returned
 * rather than discarded.
 */

export type NorthStarQualification =
  | 'advances-an-objective'
  | 'restores-capability'
  | 'removes-a-bottleneck'
  | 'protects-a-foundation'
  | 'no-north-star-recorded';

export interface NorthStarVerdict {
  readonly candidateId: string;
  readonly eligible: boolean;
  readonly qualification: NorthStarQualification | undefined;
  readonly because: string;
}

export interface NorthStarGateResult {
  readonly eligible: readonly CandidateAction[];
  readonly rejected: readonly RejectedCandidate[];
  readonly verdicts: readonly NorthStarVerdict[];
  /** True when no North Star is recorded, so the gate abstained rather than applied. */
  readonly abstained: boolean;
}

/**
 * Channels whose restoration reads as protecting a foundation rather than making progress.
 *
 * Used only by the fourth route. The second route accepts an improvement on **any**
 * channel, because every channel in the capability model is a capability.
 */
const FOUNDATION_CHANNELS = new Set([
  'energy-and-recovery',
  'emotional-regulation',
  'focus-and-clarity',
]);

function hasNorthStar(records: readonly CanonicalRecord[]): boolean {
  return records.some((record) => record.recordType === 'north-star');
}

function activeGoalIds(records: readonly CanonicalRecord[]): ReadonlySet<string> {
  return new Set(
    records
      .filter((record): record is GoalRecord => record.recordType === 'goal')
      .filter((goal) => goal.state === 'active')
      .map((goal) => goal.recordId),
  );
}

function qualify(
  candidate: CandidateAction,
  goals: ReadonlySet<string>,
): { readonly qualification: NorthStarQualification; readonly because: string } | undefined {
  if (candidate.goalId !== undefined && goals.has(candidate.goalId)) {
    return {
      qualification: 'advances-an-objective',
      because: 'Attached to an objective you have active',
    };
  }

  const restores = candidate.capabilityEffects.find((effect) => effect.effect === 'improves');
  if (restores !== undefined) {
    return {
      qualification: 'restores-capability',
      because: `Improves ${restores.channel.replace(/-/g, ' ')}`,
    };
  }

  /*
   * A bottleneck has to be *verified* to count. The domain says so by naming it in the
   * candidate's reason, which is the only place a slice can assert one — and a claim in
   * a sentence is inspectable in a way a boolean would not be.
   */
  if (
    /bottleneck|blocked|in the way|still happening|recorded \d+ times|has been a while/i.test(
      candidate.reason,
    )
  ) {
    return {
      qualification: 'removes-a-bottleneck',
      because: 'Addresses something recorded as repeatedly in the way',
    };
  }

  /*
   * Protecting a foundation looks like an action that pays off *later* on a foundation
   * channel, taken at no risk and reversibly. `improves-later` is the effect kind that
   * says so: going to bed on time does nothing for tonight and everything for tomorrow,
   * and a gate that only counted immediate benefit would rule out every such action.
   */
  if (candidate.risk === 'none-identified' && candidate.reversibility === 'reversible') {
    const protects = candidate.capabilityEffects.find(
      (effect) =>
        (effect.effect === 'improves-later' || effect.effect === 'uncertain') &&
        FOUNDATION_CHANNELS.has(effect.channel),
    );
    if (protects !== undefined) {
      return {
        qualification: 'protects-a-foundation',
        because: `Protects ${protects.channel.replace(/-/g, ' ')} rather than adding to today`,
      };
    }
  }

  return undefined;
}

export function applyNorthStarGate(
  records: readonly CanonicalRecord[],
  candidates: readonly CandidateAction[],
): NorthStarGateResult {
  const abstained = !hasNorthStar(records);

  if (abstained) {
    return {
      eligible: [...candidates],
      rejected: [],
      verdicts: candidates.map((candidate) => ({
        candidateId: candidate.id,
        eligible: true,
        qualification: 'no-north-star-recorded',
        because: 'No enduring direction is recorded, so this gate has nothing to apply',
      })),
      abstained,
    };
  }

  const goals = activeGoalIds(records);
  const eligible: CandidateAction[] = [];
  const rejected: RejectedCandidate[] = [];
  const verdicts: NorthStarVerdict[] = [];

  for (const candidate of candidates) {
    const qualified = qualify(candidate, goals);
    if (qualified === undefined) {
      verdicts.push({
        candidateId: candidate.id,
        eligible: false,
        qualification: undefined,
        because:
          'Does not advance an objective, restore a capability, remove a bottleneck, or protect a foundation',
      });
      rejected.push({
        candidateId: candidate.id,
        stage: 'north-star',
        reason:
          'Removed before ranking: nothing about it serves the recorded direction right now',
      });
      continue;
    }

    eligible.push(candidate);
    verdicts.push({
      candidateId: candidate.id,
      eligible: true,
      qualification: qualified.qualification,
      because: qualified.because,
    });
  }

  return { eligible, rejected, verdicts, abstained };
}
