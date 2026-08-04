import { newRecordId, RECORD_SCHEMA_VERSION } from '../../domain/records';
import type { ReportableMilestoneStatus } from '../../domain/records/fatherhood';
import {
  DEFAULT_MILESTONE_SOURCE,
  DEFAULT_MILESTONE_SOURCE_VERSION,
} from '../../domain/fatherhood/development';
import { localTimeContextFor } from './capture';
import { writeRecord, type WriteResult } from './writeRecord';

/**
 * Recording one milestone answer (Prompt 8D tasks 1–2).
 *
 * ## Why this never supersedes
 *
 * Every other repeated answer in this product supersedes the last: a corrected
 * observation replaces a wrong one, a new domain preference replaces the old decision.
 * A milestone answer does neither, and that is the point.
 *
 * "Not yet" in March and "yes" in June are **both true**. The first is not a mistake
 * the second corrects — it is what was the case in March, and the fact that it changed
 * is the only developmental information in the pair. Superseding would delete the one
 * thing worth keeping. So each answer is its own dated observation, and the reading
 * layer takes the newest.
 *
 * ## What this command cannot do
 *
 * It cannot write anything about what the *father* did, and no command that writes a
 * Dad action can write one of these. That separation is why a parent who has just spent
 * twenty minutes practising something cannot accidentally move his daughter's recorded
 * status by recording his own effort.
 */
export async function recordMilestone(
  input: {
    readonly milestoneId: string;
    readonly status: ReportableMilestoneStatus;
    readonly note?: string;
    /** Defaults to the built-in list; an owner-configured source overrides it. */
    readonly source?: string;
    readonly sourceVersion?: string;
  },
  now: Date,
): Promise<WriteResult> {
  const instant = now.toISOString();

  return writeRecord({
    recordId: newRecordId(),
    recordType: 'milestone-observation',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'child',
    milestoneId: input.milestoneId,
    // Stored with the answer, permanently. A later change of list leaves this intact.
    checklistSource: input.source ?? DEFAULT_MILESTONE_SOURCE,
    checklistVersion: input.sourceVersion ?? DEFAULT_MILESTONE_SOURCE_VERSION,
    status: input.status,
    ...(input.note === undefined || input.note.trim() === ''
      ? {}
      : { note: input.note.trim() }),
  });
}
