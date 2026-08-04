import { knownValue, type CanonicalRecord } from '../../domain/records';
import { assessConfidence, openCommitments, shortLabel, weekEnd, weekStart } from '../support';
import type { CategorySummary, StateAssessment, WeeklyDirection } from '../types';

/**
 * The weekly direction (`WEEKLY-DIRECTION`, `INTEL-007`).
 *
 * **The system proposes; the user disposes.** The whole reason this rule exists is
 * to remove the blank slate — not to be right. Rejecting it costs the user nothing,
 * and a quiet week is a real proposal rather than the absence of one.
 *
 * A direction never overrides safety, protected responsibilities, or changed
 * evidence, and nothing here scores the previous week morally.
 */
export function proposeWeeklyDirection(
  records: readonly CanonicalRecord[],
  state: StateAssessment,
  categories: readonly CategorySummary[],
  now: Date,
): WeeklyDirection {
  const start = weekStart(now);
  const end = weekEnd(now);
  const window = { start: start.toISOString(), end: end.toISOString() };
  const weekOf = `Week of ${shortLabel(start.toISOString())}`;

  const capacity = knownValue(state.capacity);
  const commitments = openCommitments(records);
  const nonNegotiable = commitments.filter((commitment) => commitment.nonNegotiable);

  const declining = categories.filter((category) => category.trajectory === 'declining');
  const allInsufficient = categories.every(
    (category) => category.trajectory === 'insufficient-evidence',
  );

  const basedOn: string[] = [];
  for (const category of categories) {
    basedOn.push(`${category.category}: ${category.trajectory} — ${category.condition}`);
  }
  basedOn.push(
    capacity === undefined ? 'Capacity is unknown' : `Observed capacity is ${capacity}`,
  );
  if (nonNegotiable.length > 0) {
    basedOn.push(
      `${String(nonNegotiable.length)} non-negotiable commitment${nonNegotiable.length === 1 ? '' : 's'} this week`,
    );
  }

  const confidence = assessConfidence({
    comparableCount: categories.filter(
      (category) => category.trajectory !== 'insufficient-evidence',
    ).length,
    freshness: state.readings[0]?.freshness ?? 'none',
    consistent: state.contradictions.length === 0,
    complete: !allInsufficient,
  });

  // A quiet week is proposed on its merits, not as a fallback.
  if (allInsufficient) {
    return {
      weekOf,
      window,
      kind: 'deliberately-quiet',
      proposal: 'A deliberately quiet week',
      basedOn: [...basedOn, 'No category has enough evidence to justify a focus'],
      confidence,
      lastWeek: 'No previous weekly direction recorded',
      responses: ['Confirm', 'Set a direction instead', 'Snooze', 'Skip'],
    };
  }

  if (capacity === 'depleted' || capacity === 'low') {
    return {
      weekOf,
      window,
      kind: 'deliberately-quiet',
      proposal: 'A deliberately quiet week',
      basedOn: [...basedOn, `Capacity is ${capacity}, which is not the week to add load`],
      confidence,
      lastWeek: 'No previous weekly direction recorded',
      responses: ['Confirm', 'Set a direction instead', 'Snooze', 'Skip'],
    };
  }

  const focus = declining[0];
  if (focus === undefined) {
    return {
      weekOf,
      window,
      kind: 'deliberately-quiet',
      proposal: 'A deliberately quiet week',
      basedOn: [...basedOn, 'Nothing is declining, so there is nothing that needs a push'],
      confidence,
      lastWeek: 'No previous weekly direction recorded',
      responses: ['Confirm', 'Set a direction instead', 'Snooze', 'Skip'],
    };
  }

  return {
    weekOf,
    window,
    kind: 'focus',
    proposal: `Protect two blocks for ${focus.category.replace(/-/g, ' ')}`,
    basedOn: [...basedOn, `${focus.category} is declining with the most evidence behind it`],
    confidence,
    lastWeek: 'No previous weekly direction recorded',
    responses: ['Confirm', 'Adjust', 'Snooze', 'Skip'],
  };
}
