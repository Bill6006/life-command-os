import type { DomainId } from '../../domain/domains/definitions';
import type { DomainSubmission, QuietArea } from '../boundary';

/**
 * Forgotten-domain protection (Phase 8 deliverable 11).
 *
 * > No enabled domain may remain untouched forever solely because the owner did not
 * > manually navigate to it.
 *
 * ## The tension this resolves
 *
 * The plan says two things that pull against each other. An enabled area must not be
 * forgotten indefinitely; and daily guides must not force every domain to appear. Both are
 * right, and the resolution is **where** a quiet area is raised rather than whether.
 *
 * A quiet area is never put into a morning check-in. It surfaces on the Weekly Quick
 * Domain Scan — a surface the owner opens deliberately, showing every area at once — and,
 * once it has been quiet for a season, in the deep review. Nothing interrupts, nothing
 * accumulates, and there is no backlog to return to (`OWN-007`).
 *
 * ## What "quiet" means, and why it is generous
 *
 * Three weeks without a meaningful update. That is deliberately long: an area with nothing
 * happening in it is not a problem, and a fortnight of not thinking about faith or money
 * is an ordinary fortnight. The threshold exists to catch the area somebody switched on in
 * March and has not opened since, not to encourage weekly attendance.
 *
 * An area that has **never** been updated is treated as quiet from the moment it is
 * switched on, because switching it on is a statement of intent that nothing has followed.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Long enough that an ordinary quiet stretch does not trip it. */
export const QUIET_AFTER_DAYS = 21;

/** Quiet for this long is a fact for the seasonal review, not the weekly one. */
export const LONG_FORGOTTEN_DAYS = 60;

function daysSince(iso: string | undefined, now: Date): number | undefined {
  if (iso === undefined) return undefined;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return undefined;
  return Math.floor((now.getTime() - parsed) / DAY_MS);
}

export function findQuietAreas(
  submissions: readonly DomainSubmission[],
  now: Date,
): readonly QuietArea[] {
  const quiet: QuietArea[] = [];

  for (const submission of submissions) {
    if (!submission.enabled) continue;

    const days = daysSince(submission.scan.lastMeaningfulUpdate, now);

    if (days === undefined) {
      quiet.push({
        domainId: submission.domainId,
        daysSinceUpdate: undefined,
        raiseOn: 'weekly-scan',
        because: 'Switched on, with nothing recorded in it yet',
      });
      continue;
    }

    if (days >= LONG_FORGOTTEN_DAYS) {
      quiet.push({
        domainId: submission.domainId,
        daysSinceUpdate: days,
        raiseOn: 'deep-review',
        because: `Nothing meaningful for ${String(days)} days — long enough to be worth asking whether it still belongs switched on`,
      });
      continue;
    }

    if (days >= QUIET_AFTER_DAYS) {
      quiet.push({
        domainId: submission.domainId,
        daysSinceUpdate: days,
        raiseOn: 'weekly-scan',
        because: `Nothing meaningful for ${String(days)} days`,
      });
    }
  }

  return quiet;
}

/** Areas that will be shown as quiet on the weekly scan. */
export function quietOnWeeklyScan(quiet: readonly QuietArea[]): ReadonlySet<DomainId> {
  return new Set(quiet.map((area) => area.domainId));
}
