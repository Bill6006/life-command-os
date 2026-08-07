import type { CanonicalRecord } from '../domain/records';
import {
  detectMaterialChange,
  newestCluster,
  recordsBefore,
} from './change-detection/materialChange';
import { selectOutput } from './decision/selectOutput';
import { proposeWeeklyDirection } from './decision/weeklyDirection';
import { assessWeeklyContinuity, type WeeklyContinuity } from './decision/weeklyContinuity';
import {
  evaluateEffectiveness,
  evaluateForecasts,
  type EffectivenessEvaluation,
  type ForecastEvaluation,
} from './evaluation/evaluate';
import { untreatedForecast } from './forecast/untreatedForecast';
import { generateCandidates } from './intervention/candidateActions';
import { predictEffects } from './intervention/predictedEffects';
import { deriveBeliefs, type BeliefState } from './learning/beliefs';
import { buildGraphs, type Graph } from './learning/insights';
import { assessReturn, type ReturnAfterAbsence } from './state/absence';
import { assessState } from './state/assessState';
import { summariseCategories } from './state/categorySummaries';
import { focusedHoursTrajectory } from './state/trajectories';
import type { EpisodeCore } from './types';
import { formatLocalClock } from '../domain/time/localTime';

import { buildDomainPanels, type DomainPanel } from './domains/domainPanel';
import { enforceOneCandidatePerDomain } from './domains/candidateLimit';
import { assessHealth, generateHealthCandidate, healthContribution } from './domains/health';
import { assessCareer, careerContribution, generateCareerCandidate } from './domains/career';
import {
  assessFatherhood,
  fatherhoodContribution,
  generateFatherhoodCandidate,
} from './domains/fatherhood';
import {
  assessEmotional,
  emotionalContribution,
  generateEmotionalCandidate,
} from './domains/emotional';
import { assessFaith, faithContribution, generateFaithCandidate } from './domains/faith';
import { assessHome, generateHomeCandidate, homeContribution } from './domains/home';
import { assessMoney, generateMoneyCandidate, moneyContribution } from './domains/money';
import { buildHealthScan } from './domains/health';
import { buildCareerScan } from './domains/career';
import { buildFatherhoodScan } from './domains/fatherhood';
import { buildEmotionalScan } from './domains/emotional';
import { buildFaithScan } from './domains/faith';
import { buildHomeScan } from './domains/home';
import { buildMoneyScan } from './domains/money';
import { enabledTopics } from '../domain/emotional/permissions';
import { cadenceSettings, intentionallyQuiet } from '../domain/domains/cadence';
import { resolveDomains } from './domains/registry';
import { runCommandCore, type CommandCoreResult, type DomainSubmission } from '../command-core';

export * from './types';
export * from './contracts';
export type { DomainPanel, DomainContribution, DomainMove } from './domains/domainPanel';
export type { ResolvedDomain } from './domains/registry';
export type { ForecastEvaluation, EffectivenessEvaluation } from './evaluation/evaluate';
export type { BeliefState } from './learning/beliefs';
export type { Graph, TrendGraph, ComparisonGraph } from './learning/insights';
export type { WeeklyContinuity } from './decision/weeklyContinuity';
export type { ReturnAfterAbsence } from './state/absence';
export type {
  CommandCoreResult,
  CoveragePlan,
  DecisionTrace,
  DeepReview,
  DomainScan,
  DomainSubmission,
  QuietArea,
  WeeklyScan,
  WeeklySynthesis,
} from '../command-core';

/**
 * Everything Phase 5 learns.
 *
 * `forecastEvaluations` and `effectiveness` are **separate fields and are never
 * combined**. A well-calibrated forecast says nothing about whether the advice
 * helped, and vice versa (`LEARN-001`). Nothing in this codebase averages them.
 */
export interface LearningResult {
  readonly forecastEvaluations: readonly ForecastEvaluation[];
  readonly effectiveness: readonly EffectivenessEvaluation[];
  readonly beliefs: readonly BeliefState[];
  readonly graphs: readonly Graph[];
  readonly continuity: WeeklyContinuity;
  readonly absence: ReturnAfterAbsence;
}

export interface EpisodeResult extends EpisodeCore {
  readonly learning: LearningResult;
  /**
   * Everything the cross-domain subsystem produced (Phase 8).
   *
   * The single result of one `runCommandCore` call. Surfaces read from here rather than
   * recomputing anything: the weekly scan, the deep review, the synthesis, the coverage
   * plan, and the decision trace are all one deterministic pass over the same evidence.
   */
  readonly commandCore: CommandCoreResult;
  /**
   * One panel per domain the owner can see (Prompt 8A).
   *
   * Empty until a domain is switched on, which is the current state: no slice exists
   * yet, so nothing new reaches any surface. The framework is wired and silent.
   */
  readonly domains: readonly DomainPanel[];
}

/**
 * One decision episode, now closing the loop.
 *
 * The lifecycle in order: gather, assess, forecast, generate candidates, predict
 * their effects, filter, compare, emit exactly one output — then evaluate what
 * earlier episodes predicted and recommended, and update beliefs conservatively.
 *
 * Deterministic throughout: `now` is passed in and no module reads the clock or a
 * random source.
 *
 * Intelligence emits structured results and **never writes to storage** (ARCH-001).
 */
export function runEpisode(records: readonly CanonicalRecord[], now: Date): EpisodeResult {
  const state = assessState(records, now);
  const trajectory = focusedHoursTrajectory(records, now);
  const categories = summariseCategories(records, state, trajectory, now);
  const forecast = untreatedForecast(records, trajectory, now);

  /*
   * The one-candidate-per-domain limit is applied before comparison, not after. A
   * domain that offers two gets one compared and one reported — so a slice's mistake
   * shows up as a rejection rather than as a menu reaching the surface (`XDS-015`).
   */
  /*
   * Domains offer into the same comparison as the core engine. Health's candidate wins
   * on its merits or loses on them — there is no health lane, and nothing about health
   * reaches Now unless it was the single best move available.
   */
  const healthEvidence = assessHealth(records, now);
  const health = generateHealthCandidate(records, healthEvidence, state, now);
  const careerEvidence = assessCareer(records, now);
  const career = generateCareerCandidate(records, careerEvidence);
  const fatherhoodEvidence = assessFatherhood(records, now);
  const fatherhood = generateFatherhoodCandidate(records, fatherhoodEvidence, now);
  const emotionalEvidence = assessEmotional(records, now);
  const emotional = generateEmotionalCandidate(records, emotionalEvidence, now);
  const faithEvidence = assessFaith(records, now);
  const faith = generateFaithCandidate(records, faithEvidence);
  const homeEvidence = assessHome(records, now);
  const home = generateHomeCandidate(records, homeEvidence);
  const moneyEvidence = assessMoney(records, now);
  const money = generateMoneyCandidate(records, moneyEvidence);

  /*
   * Episode assembly ends here, and Command Core begins.
   *
   * Everything above gathered evidence; everything below is one call into the
   * cross-domain subsystem. The seam is deliberate and documented in
   * `src/command-core/boundary.ts`: this function knows which domains exist and how to
   * run them, and Command Core knows none of that — it receives submissions and decides.
   */
  const enabled = new Set(
    resolveDomains(records)
      .filter((domain) => domain.available && domain.state === 'enabled')
      .map((domain) => domain.definition.id),
  );

  const submissions: DomainSubmission[] = [
    {
      domainId: 'health-recovery-energy',
      candidate: health.candidate,
      because: health.because,
      scan: buildHealthScan(healthEvidence),
      enabled: enabled.has('health-recovery-energy'),
    },
    {
      domainId: 'career-and-learning',
      candidate: career.candidate,
      because: career.because,
      scan: buildCareerScan(careerEvidence),
      enabled: enabled.has('career-and-learning'),
    },
    {
      domainId: 'fatherhood',
      candidate: fatherhood.candidate,
      because: fatherhood.because,
      scan: buildFatherhoodScan(fatherhoodEvidence),
      enabled: enabled.has('fatherhood'),
    },
    {
      domainId: 'emotional-and-relationships',
      candidate: emotional.candidate,
      because: emotional.because,
      scan: buildEmotionalScan(emotionalEvidence),
      enabled: enabled.has('emotional-and-relationships'),
    },
    {
      domainId: 'faith-and-meaning',
      candidate: faith.candidate,
      because: faith.because,
      scan: buildFaithScan(faithEvidence),
      enabled: enabled.has('faith-and-meaning'),
    },
    {
      domainId: 'home-and-environment',
      candidate: home.candidate,
      because: home.because,
      scan: buildHomeScan(homeEvidence),
      enabled: enabled.has('home-and-environment'),
    },
    {
      domainId: 'money',
      candidate: money.candidate,
      because: money.because,
      scan: buildMoneyScan(records, moneyEvidence),
      enabled: enabled.has('money'),
    },
  ];

  /*
   * The one-candidate-per-domain limit is applied before Command Core sees anything. A
   * domain that offers two gets one compared and one reported — so a slice's mistake shows
   * up as a rejection rather than as a menu reaching the surface (`XDS-015`).
   */
  const coreCandidates = generateCandidates(records, state, now);
  const candidates = enforceOneCandidatePerDomain([
    ...coreCandidates,
    ...submissions.flatMap((submission) =>
      submission.candidate === undefined ? [] : [submission.candidate],
    ),
  ]).accepted;
  const effects = candidates.map((candidate) => predictEffects(candidate, state));

  /*
   * Command Core receives what survived the per-domain limit, split back into its two
   * origins. Handing it the raw lists would let a slice that offered two get both into
   * arbitration — the limit would have been computed and then ignored, which is worse
   * than not computing it.
   */
  const accepted = new Set(candidates.map((candidate) => candidate.id));
  const commandCore = runCommandCore({
    records,
    now,
    state,
    trajectory,
    categories,
    forecast,
    coreCandidates: coreCandidates.filter((candidate) => accepted.has(candidate.id)),
    submissions: submissions.map((submission) =>
      submission.candidate !== undefined && accepted.has(submission.candidate.id)
        ? submission
        : { ...submission, candidate: undefined },
    ),
    predictions: effects,
    enabledTopics: new Set<string>(enabledTopics(records)),
    cadence: new Map(
      cadenceSettings(records, now).map((setting) => [setting.domainId, setting.cadence]),
    ),
    snoozedUntil: new Map(
      cadenceSettings(records, now).flatMap((setting) =>
        setting.snoozedUntil === undefined ? [] : [[setting.domainId, setting.snoozedUntil]],
      ),
    ),
    intentionallyQuiet: intentionallyQuiet(records),
  });

  const { output, rejected } = { output: commandCore.output, rejected: commandCore.rejected };
  const weeklyDirection = proposeWeeklyDirection(records, state, categories, now);

  /* --- Phase 5: evaluate, then learn -------------------------------------- */
  const forecastEvaluations = evaluateForecasts(records, now);
  const effectiveness = evaluateEffectiveness(records, now);
  const beliefs = deriveBeliefs(records, effectiveness, now);
  const continuity = assessWeeklyContinuity(records, effectiveness);
  const absence = assessReturn(records, now);
  const graphs = buildGraphs(
    records,
    trajectory,
    forecastEvaluations,
    effectiveness,
    beliefs,
    now,
  );

  /*
   * Material change is a diff of two real runs. Re-running the engine over the
   * records that existed at the previous assessment is the only approach that
   * cannot claim a change the engine did not actually make.
   */
  const cluster = newestCluster(records);
  const clusterAt = cluster[0]?.recordedAt;
  const previousRecords = clusterAt === undefined ? [] : recordsBefore(records, clusterAt);

  const previous =
    previousRecords.length === 0
      ? undefined
      : (() => {
          const previousState = assessState(previousRecords, now);
          const previousTrajectory = focusedHoursTrajectory(previousRecords, now);
          const previousForecast = untreatedForecast(previousRecords, previousTrajectory, now);
          const previousCandidates = generateCandidates(previousRecords, previousState, now);
          const previousEffects = previousCandidates.map((candidate) =>
            predictEffects(candidate, previousState),
          );
          const previousSelection = selectOutput(
            previousRecords,
            previousState,
            previousCandidates,
            previousEffects,
            previousForecast,
          );
          return { output: previousSelection.output, state: previousState };
        })();

  const whatChanged = detectMaterialChange(records, previous, { output, state }, now);

  return {
    episodeId: `episode-${now.toISOString()}`,
    at: now.toISOString(),
    /*
     * The owner's wall clock, not the canonical instant's.
     *
     * This read `timeZone: 'UTC'`, which showed the stored instant as though the owner
     * lived in it — four hours ahead of the phone during EDT, which is what owner testing
     * reported. `at` above stays UTC because that is the canonical fact; this is the
     * human-facing projection of it (`V33-031`).
     */
    clock: formatLocalClock(now),
    state,
    trajectory,
    categories,
    forecast,
    whatChanged,
    output,
    weeklyDirection,
    learning: { forecastEvaluations, effectiveness, beliefs, graphs, continuity, absence },
    domains: buildDomainPanels(
      records,
      categories,
      whatChanged.changes,
      new Map([
        [
          'health-recovery-energy',
          healthContribution(records, healthEvidence, health, state, now),
        ],
        ['career-and-learning', careerContribution(careerEvidence, career, trajectory)],
        ['fatherhood', fatherhoodContribution(fatherhoodEvidence, fatherhood, trajectory)],
        [
          'emotional-and-relationships',
          emotionalContribution(emotionalEvidence, emotional, trajectory),
        ],
        ['faith-and-meaning', faithContribution(faithEvidence, faith)],
        ['home-and-environment', homeContribution(homeEvidence, home)],
        ['money', moneyContribution(moneyEvidence, money)],
      ]),
    ),
    commandCore,
    internal: { candidates, effects, rejected },
  };
}
