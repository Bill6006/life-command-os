import { z } from 'zod';
import { envelopeShape, withEnvelopeInvariants } from './envelope';

/**
 * `MilestoneObservationRecord` — the twenty-fifth family, and Prompt 8D's only one.
 *
 * ## Why this cannot be an ordinary observation
 *
 * A milestone answer is meaningless without the checklist it was answered against.
 * "Not yet" against one source's wording at one version is not the same statement as
 * "not yet" against a differently-worded item, and developmental checklists are
 * revised. Encoding the source and version into an attribute string would put them
 * beyond validation and beyond query — the same failure the anchored scales avoid by
 * storing `scaleId` and `scaleVersion` beside every reading.
 *
 * So the source and its version travel **with the answer**, permanently. An answer
 * given today still means exactly what it meant if the catalogue is replaced tomorrow.
 *
 * ## What this family deliberately cannot hold
 *
 * No score, no percentage, no age-equivalent, no percentile, no interpretation, and
 * no conclusion. There is nowhere to put one. A milestone record says what was
 * observed against a named item on a named list, and nothing else — which is the
 * difference between a parent's note and a developmental assessment this product has
 * no business producing.
 *
 * It also has no field for anything the **parent** did. Dad actions are separate
 * records entirely (`father:` observations), so no code path can turn "I practised
 * this with her" into a change in her recorded status.
 */

/**
 * The statuses the owner can report.
 *
 * `not-assessed` is deliberately **absent** from this list. It is the state of having
 * no record, and the model has one representation of that already: no record. Storing
 * "not assessed" would create a second, and the two would disagree the first time a
 * record was written without the placeholder being cleared (`OWN-024`).
 *
 * `possible-loss` is the one that matters most. A skill that was there and is not any
 * more is the single observation on any developmental checklist that warrants prompt
 * attention, so it is a first-class reportable status rather than a note someone might
 * write in free text.
 */
export const REPORTABLE_MILESTONE_STATUSES = [
  'yes',
  'not-yet',
  'not-sure',
  'concern',
  'possible-loss',
] as const;
export type ReportableMilestoneStatus = (typeof REPORTABLE_MILESTONE_STATUSES)[number];

/** Every status the owner sees, including the one that means "no record exists". */
export const MILESTONE_STATUSES = ['not-assessed', ...REPORTABLE_MILESTONE_STATUSES] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  'not-assessed': 'Not assessed',
  yes: 'Yes',
  'not-yet': 'Not yet',
  'not-sure': 'Not sure',
  concern: 'Concern',
  'possible-loss': 'Was doing it, not now',
};

export const milestoneObservationRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('milestone-observation', 'observed'),
    /** The item on the list. Meaningless without the two fields below. */
    milestoneId: z.string().min(1).max(80),
    /**
     * Which list. Owner-configurable, so it is data rather than an enum.
     *
     * Named `checklistSource` rather than `source` because the envelope already has a
     * `source` — how the record reached the app. Two different questions, and a single
     * field answering both would eventually answer neither.
     */
    checklistSource: z.string().min(1).max(120),
    /** Which revision of that list. The reason this is a family and not an attribute. */
    checklistVersion: z.string().min(1).max(40),
    status: z.enum(REPORTABLE_MILESTONE_STATUSES),
    /** The owner's own words, never required and never interpreted. */
    note: z.string().max(1000).optional(),
  }),
);
export type MilestoneObservationRecord = z.infer<typeof milestoneObservationRecord>;
