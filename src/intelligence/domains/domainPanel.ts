import type { CanonicalRecord } from '../../domain/records';
import type { DomainDefinition, DomainId } from '../../domain/domains/definitions';
import type { CapabilityEffect } from '../../domain/capabilities';
import type {
  CandidateAction,
  CategorySummary,
  ConfidenceAssessment,
  FreshnessStatus,
  MaterialChange,
} from '../types';
import type { VisualSpec } from '../visuals/eligibility';
import type { Graph } from '../learning/insights';
import { visibleDomains, type ResolvedDomain } from './registry';

/**
 * The shared domain intelligence panel contract (Prompt 8A task 2, `OWN-013`).
 *
 * Every enabled domain shows the same twelve things, in the same order, for the same
 * reason: an area of life that gets a different shape of summary is an area that gets
 * a different standard of evidence. A domain with a compelling story and a domain with
 * nothing to say should be *visibly* different in content and *identical* in
 * structure — which is only possible if the structure is defined once, here.
 *
 * ## What the type refuses to hold
 *
 * There is no score, no rating, no percentage, and nowhere to put one. `condition` is
 * a sentence and `trajectory` is a word from a closed set. This is the same device
 * used for capability effects, and for the same reason: a numeric field on this type
 * would be rendered within a week, and a wall of seven numbers is the "category score
 * wall" the gate forbids.
 *
 * ## Every field can honestly be empty
 *
 * `bottleneck` may be undefined, `move` may be undefined, `strongestEvidence` may be
 * an empty list. A domain with thin evidence says so rather than filling the shape —
 * because a panel that always looks complete teaches the owner to stop reading it.
 */

export interface DomainPanel {
  readonly domainId: DomainId;
  readonly label: string;
  readonly question: string;
  readonly state: 'enabled' | 'deprioritised';

  /** 1. How this area serves the enduring direction, or that it does not right now. */
  readonly northStarContribution: string;
  /** 2. Plain, non-moral description of where things stand. Never a grade. */
  readonly condition: string;
  /** 3. Direction of travel, from the shared closed set. */
  readonly trajectory: CategorySummary['trajectory'];
  /** 4. How much the above is worth relying on. */
  readonly confidence: ConfidenceAssessment;
  /** 5. How current the evidence underneath it is. */
  readonly freshness: FreshnessStatus;
  /** 6. What is actually driving the condition. */
  readonly drivers: readonly string[];
  /** 7. The thing most in the way, when one is identifiable. */
  readonly bottleneck: string | undefined;
  /** 8. What moved since last time, and why the panel changed. */
  readonly whatChanged: readonly MaterialChange[];
  /** 9. The records this rests on, described. Empty when there are none. */
  readonly strongestEvidence: readonly string[];
  /** 10. At most one optional move, always subordinate to the global decision. */
  readonly move: DomainMove | undefined;
  /**
   * 11. The prompt that owns updating this area.
   *
   * Always answerable. A panel exists only for a domain the owner was allowed to switch
   * on, and a domain is only switchable once the prompt named here exists — so "the
   * button opens an empty guide" is not a state this contract can reach. It used to be:
   * 8A could enable a domain with no questions behind it, and the panel carried an
   * `updateAvailable` flag to say so. The Manage Areas control replaced that flag with a
   * guarantee, and a flag that can no longer be false is worse than no flag.
   */
  readonly updatePromptId: string;
  /** 12. Visuals this domain's evidence has earned. Often none. */
  readonly visuals: readonly VisualSpec[];
  /**
   * Renderable charts, where the evidence supports one.
   *
   * Separate from `visuals` because a `VisualSpec` is a declaration — what a
   * representation would have to state to be allowed — while a `Graph` carries the
   * points as well. A domain with a chart supplies both; a domain with only an
   * evidence summary supplies just the declaration.
   */
  readonly graphs: readonly Graph[];

  /** Real quantities the engine counted. Never a 0–100 anything. */
  readonly metrics: readonly { readonly label: string; readonly value: string }[];
  readonly capabilityEffects: readonly CapabilityEffect[];
}

/**
 * A domain's optional move.
 *
 * `subordinate` is `true` and there is no way to set it otherwise. A domain move is
 * never the answer to "what should I do now" — that question has exactly one answer
 * and it comes from the global comparison (`OWN-003`, `XDS-032`).
 */
export interface DomainMove {
  readonly candidate: CandidateAction;
  readonly subordinate: true;
  readonly labelledAs: string;
}

/**
 * The inputs a domain slice supplies. The framework supplies everything else.
 *
 * A slice that returns nothing but a condition still produces a valid panel — with an
 * undefined bottleneck, no move, and no visuals — which is exactly what a slice should
 * do on its first day.
 */
export interface DomainContribution {
  readonly condition: string;
  readonly trajectory: CategorySummary['trajectory'];
  readonly confidence: ConfidenceAssessment;
  readonly freshness: FreshnessStatus;
  readonly drivers: readonly string[];
  readonly bottleneck?: string | undefined;
  readonly strongestEvidence?: readonly string[] | undefined;
  readonly move?: CandidateAction | undefined;
  readonly visuals?: readonly VisualSpec[] | undefined;
  readonly graphs?: readonly Graph[] | undefined;
  readonly metrics?: readonly { readonly label: string; readonly value: string }[] | undefined;
  readonly capabilityEffects?: readonly CapabilityEffect[] | undefined;
  readonly northStarContribution?: string | undefined;
}

/**
 * Builds the panel.
 *
 * The contract is assembled here rather than by each slice, so a slice cannot omit a
 * field, reorder the story, or quietly invent a thirteenth thing to show. Adding a
 * field to `DomainPanel` is a decision made once for all domains.
 */
export function buildDomainPanel(
  domain: ResolvedDomain,
  contribution: DomainContribution,
  whatChanged: readonly MaterialChange[],
): DomainPanel {
  const definition: DomainDefinition = domain.definition;

  return {
    domainId: definition.id,
    label: definition.label,
    question: definition.question,
    state: domain.state === 'enabled' ? 'enabled' : 'deprioritised',

    northStarContribution:
      contribution.northStarContribution ??
      'No stated link to the North Star right now. That is a fact about this moment, not a judgement about the area.',
    condition: contribution.condition,
    trajectory: contribution.trajectory,
    confidence: contribution.confidence,
    freshness: contribution.freshness,
    drivers: contribution.drivers,
    bottleneck: contribution.bottleneck,
    whatChanged,
    strongestEvidence: contribution.strongestEvidence ?? [],
    // Deprioritised domains are readable and silent: no move, ever.
    move:
      domain.state === 'enabled' && contribution.move !== undefined
        ? {
            candidate: contribution.move,
            subordinate: true,
            labelledAs: `Optional move in ${definition.label.toLowerCase()} — the answer on Now still comes first`,
          }
        : undefined,
    updatePromptId: definition.updatePromptId,
    visuals: contribution.visuals ?? [],
    graphs: contribution.graphs ?? [],
    metrics: contribution.metrics ?? [],
    capabilityEffects: contribution.capabilityEffects ?? [],
  };
}

/**
 * What the framework can say about a domain before its slice exists.
 *
 * Built entirely from the shared category summaries the engine already computes, so it
 * introduces **no new truth and no domain-specific logic** — it is the panel contract
 * applied to evidence that was already there. A slice replaces this with something
 * that understands the area; until then, a switched-on domain shows what the shared
 * records honestly support rather than an empty frame.
 *
 * A domain whose categories are not yet active abstains outright. Saying "nothing is
 * known here yet" is a true statement; inventing a condition to fill the panel is not.
 */
export function defaultContribution(
  domain: ResolvedDomain,
  categories: readonly CategorySummary[],
): DomainContribution {
  const relevant = categories.filter((summary) =>
    domain.definition.reads.includes(summary.category),
  );

  const primary = relevant[0];
  if (primary === undefined) {
    return {
      condition:
        'Nothing is recorded for this area yet. It is switched on and listening; it has not been given anything to read.',
      trajectory: 'insufficient-evidence',
      confidence: {
        label: 'insufficient-evidence',
        why: 'No records in the categories this area reads.',
        dimensions: [
          {
            dimension: 'comparable-evidence-volume',
            assessment: 'undermines',
            note: 'Nothing to compare',
          },
        ],
      },
      freshness: 'none',
      drivers: [],
      strongestEvidence: [],
      metrics: [],
    };
  }

  return {
    condition: primary.condition,
    trajectory: primary.trajectory,
    confidence: primary.confidence,
    freshness: primary.freshness,
    drivers: primary.drivers,
    bottleneck: primary.wouldChangeIt,
    strongestEvidence: relevant.flatMap((summary) =>
      summary.metrics.map((metric) => `${metric.label}: ${metric.value}`),
    ),
    metrics: relevant.flatMap((summary) => summary.metrics),
    northStarContribution: `Read from ${relevant
      .map((summary) => summary.category.replace(/-/g, ' '))
      .join(', ')} — the same records everything else uses.`,
  };
}

/**
 * Panels for every domain the owner can see.
 *
 * Empty until the owner switches something on, which is where every profile starts.
 * `visibleDomains` applies availability as well as state, so a preference naming an
 * area this build has not implemented produces no panel — the guarantee that the owner
 * is never shown a frame with nothing behind it holds here, not only at the control.
 */
export function buildDomainPanels(
  records: readonly CanonicalRecord[],
  categories: readonly CategorySummary[],
  whatChanged: readonly MaterialChange[],
  contributions: ReadonlyMap<DomainId, DomainContribution> = new Map(),
): DomainPanel[] {
  return visibleDomains(records).map((domain) =>
    buildDomainPanel(
      domain,
      contributions.get(domain.definition.id) ?? defaultContribution(domain, categories),
      // A deprioritised domain is readable and silent — including about what changed.
      domain.state === 'enabled' ? whatChanged : [],
    ),
  );
}
