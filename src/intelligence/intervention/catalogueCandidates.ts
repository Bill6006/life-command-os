import type { CanonicalRecord } from '../../domain/records';
import { MOVE_FAMILIES } from '../../domain/moves/catalogue';
import type { MovePattern } from '../../domain/moves/families';
import { personalise } from '../../domain/moves/personalise';
import { domainDefinition, type DomainId } from '../../domain/domains/definitions';
import type { LifeCategory, ProtectedContext } from '../../domain/records/categories';
import { enabledDomains } from '../domains/registry';
import { northStar, openCommitments } from '../support';
import {
  judgeAll,
  type EligibilityContext,
} from '../../command-core/eligibility/catalogueEligibility';
import { completedMoves } from '../../command-core/eligibility/completedMoves';
import { suppressedMoveIds } from '../../command-core/arbitration/stances';
import { canonicalPatternId, pattern as patternById } from '../../domain/moves/registry';
import type { CandidateAction, StateAssessment } from '../types';

/**
 * The catalogue, entering generation (`V33-056`, v3.3 section D).
 *
 * ## The gap this closes
 *
 * The migration made every domain slice a view over one authored library, and left the
 * *selection* untouched: each slice still walked its own decision tree over the handful of
 * moves it had always known about. Thirty-five of a hundred and thirteen patterns could
 * reach the owner. The other seventy-eight were authored, valid, tested, and unreachable —
 * not because anything had judged them unsuitable, but because no array named them.
 *
 * That is the failure mode this module exists to remove. A pattern enters the comparison
 * because `judge` found the situation admits it, and for no other reason. There is no list
 * of ids here and there is nowhere to add one.
 *
 * ## Why these are core candidates and not domain submissions
 *
 * A domain may submit one candidate per episode (`XDS-015`), and that limit is correct: it
 * stops a slice putting a menu on screen. But it is a limit on what a *slice* may argue
 * for, and these are not a slice's argument. They carry no `originDomainId`, they compete
 * in the shared pool, and a domain's own pick still competes against them on the same
 * terms. The slice keeps its voice; it stops being the only one.
 *
 * ## Why this cannot become noise
 *
 * Candidates are internal (`INTEL-006`). Widening the pool widens what the arbiter may
 * choose *between*, and changes nothing about what reaches the surface: one Do Now, or one
 * material question, or silence. The output invariants live downstream and are unmoved by
 * how many candidates arrive.
 *
 * ## What is deliberately not personalised
 *
 * Nothing here fills a personalisation slot. `personalise(pattern, {})` strips unfilled
 * slots and leaves a sentence that still reads, and the owner's own words never enter it.
 * That is not a simplification — it is what keeps this path clear of the protected-context
 * rules. Faith practices may only be quoted on Now with explicit permission, and a
 * catalogue candidate that could never quote anything cannot breach that by omission.
 */

/**
 * Where a move lands, when the arbiter has to file it.
 *
 * A family's first domain, and that domain's own category. Families serving several areas
 * are filed under the first they declare, which is the one the family was written for.
 */
function categoryFor(domain: DomainId | undefined): LifeCategory {
  if (domain === undefined) return 'time-attention-capacity';
  return domainDefinition(domain).reads[0] ?? 'time-attention-capacity';
}

/**
 * The contexts each area's moves must not interrupt.
 *
 * Copied deliberately from what each slice already declares for its own candidates rather
 * than generalised into one permissive default. Money's list is every context there is,
 * because being asked about money in front of family is worse than not being asked; a
 * shared default would have quietly relaxed that.
 */
const PROTECTED_BY_DOMAIN: Record<DomainId, readonly ProtectedContext[]> = {
  'health-recovery-energy': ['sleep', 'commute'],
  'career-and-learning': ['sleep', 'family', 'caregiving', 'commute'],
  'emotional-and-relationships': ['sleep', 'work-focus', 'commute'],
  fatherhood: ['sleep', 'work-focus', 'commute'],
  'faith-and-meaning': ['sleep', 'work-focus', 'commute'],
  'home-and-environment': ['sleep', 'work-focus', 'commute'],
  money: ['sleep', 'family', 'caregiving', 'work-focus', 'commute', 'recovery'],
};

/**
 * Safety class as risk.
 *
 * The catalogue's `safety` says who else a move touches. `risk` says what could go wrong.
 * They are not the same question, and the mapping is deliberately conservative in the one
 * direction that matters: nothing sensitive is ever described as carrying no identified
 * risk, because "none identified" is a claim and nobody has looked.
 */
function riskOf(pattern: MovePattern): CandidateAction['risk'] {
  switch (pattern.safety) {
    case 'sensitive':
      return 'moderate';
    case 'interpersonal':
      return 'low';
    default:
      return 'none-identified';
  }
}

const FAMILY = new Map(MOVE_FAMILIES.map((family) => [family.familyId, family]));

/** One eligible pattern, as something the arbiter can compare. */
export function toCandidate(pattern: MovePattern, reason: string): CandidateAction {
  const family = FAMILY.get(pattern.familyId);
  const domain = family?.domains[0];

  return {
    /*
     * The canonical pattern id *is* the candidate id here. There is no per-occurrence
     * dimension to add — unlike `focus:<goalId>`, this candidate is not about one goal —
     * and using the pattern id directly means a stance the owner sets on it lands on the
     * same identity the evidence does.
     */
    id: pattern.patternId,
    patternId: pattern.patternId,
    statement: personalise(pattern, {}).statement,
    category: categoryFor(domain),
    intendedOutcome: pattern.intendedOutcome,
    followUp: pattern.followUp,
    capabilityEffects: pattern.effects.map((effect) => ({
      channel: effect.channel,
      effect: effect.effect,
      magnitude: effect.magnitude,
      /* Authored from research and general reasoning, never from this owner's evidence. */
      basis: 'external-research' as const,
      crossDomain: false,
    })),
    durationMinutes: pattern.durationMinutes,
    ...(pattern.capacity === undefined ? {} : { capacity: pattern.capacity }),
    minimumMinutes: pattern.minimumMinutes,
    minimumVersion: pattern.minimumVersion,
    fallback: pattern.fallback,
    stoppingPoint: pattern.stoppingPoint,
    friction: pattern.friction,
    risk: riskOf(pattern),
    reversibility: 'reversible',
    blockedByProtectedContexts:
      domain === undefined ? ['sleep', 'family', 'caregiving'] : PROTECTED_BY_DOMAIN[domain],
    goalId: undefined,
    reason,
  };
}

/**
 * Every catalogue pattern the situation admits, as candidates.
 *
 * `already` is the set of pattern ids the rest of generation has covered. A slice that
 * has argued for a move keeps that argument — its wording, its reason, its evidence about
 * *why now* — and this must not shadow it with a generic duplicate. Deduplication on
 * canonical identity is the whole reason the rename happened.
 */
export function catalogueCandidates(
  records: readonly CanonicalRecord[],
  state: StateAssessment,
  now: Date,
  already: ReadonlySet<string>,
): CandidateAction[] {
  const enabled = new Set<DomainId>(
    enabledDomains(records).map((domain) => domain.definition.id),
  );

  const context: EligibilityContext = {
    now,
    enabledDomains: enabled,
    situation: state.situation,
    /*
     * Re-keyed onto canonical identity. Stances are recorded against the generator id the
     * owner was looking at — `health:pause` — and this module judges patterns by their
     * catalogue id. Matching raw would let a move the owner forbade come straight back
     * under its canonical name, which is the one failure here that is not recoverable by
     * the owner noticing.
     */
    suppressed: new Map(
      [...suppressedMoveIds(records, now, state.situation)].map(([id, because]) => [
        canonicalPatternId(id),
        because,
      ]),
    ),
    recentlyCompleted: completedMoves(records),
    hasNorthStar: northStar(records) !== undefined,
    hasOpenCommitment: openCommitments(records).length > 0,
  };

  const out: CandidateAction[] = [];

  for (const verdict of judgeAll(context)) {
    if (!verdict.eligible) continue;
    if (already.has(verdict.patternId)) continue;
    out.push(toCandidate(patternById(verdict.patternId), verdict.because));
  }

  /* Deterministic order, so the same records always produce the same comparison. */
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
