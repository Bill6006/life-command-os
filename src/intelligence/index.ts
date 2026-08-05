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

export * from './types';
export * from './contracts';
export type { DomainPanel, DomainContribution, DomainMove } from './domains/domainPanel';
export type { ResolvedDomain } from './domains/registry';
export type { ForecastEvaluation, EffectivenessEvaluation } from './evaluation/evaluate';
export type { BeliefState } from './learning/beliefs';
export type { Graph, TrendGraph, ComparisonGraph } from './learning/insights';
export type { WeeklyContinuity } from './decision/weeklyContinuity';
export type { ReturnAfterAbsence } from './state/absence';

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

  const candidates = enforceOneCandidatePerDomain([
    ...generateCandidates(records, state, now),
    ...(health.candidate === undefined ? [] : [health.candidate]),
    ...(career.candidate === undefined ? [] : [career.candidate]),
    ...(fatherhood.candidate === undefined ? [] : [fatherhood.candidate]),
    ...(emotional.candidate === undefined ? [] : [emotional.candidate]),
    ...(faith.candidate === undefined ? [] : [faith.candidate]),
    ...(home.candidate === undefined ? [] : [home.candidate]),
  ]).accepted;
  const effects = candidates.map((candidate) => predictEffects(candidate, state));

  const { output, rejected } = selectOutput(records, state, candidates, effects, forecast);
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
    clock: now.toLocaleString('en-GB', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    }),
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
      ]),
    ),
    internal: { candidates, effects, rejected },
  };
}
