import { z } from 'zod';

/**
 * The canonical record envelope (ADR-0005, `DATA-001`, `DATA-002`).
 *
 * Every canonical record carries this. The envelope is where several
 * constitutional rules stop being prose and start being enforceable:
 *
 *   - `occurredAt` and `recordedAt` are separate, because when something happened
 *     and when the system learned of it are different facts. Evaluation needs both,
 *     and Phase 8 time-respecting replay is impossible without them.
 *   - Provenance methods are constrained per record family, so an observation
 *     cannot claim to be inferred and an inference cannot pose as first-hand fact.
 *   - Supersession points **backwards only**. A correction names what it replaces;
 *     it never reaches back and mutates the record it supersedes. That is what
 *     makes "append-oriented" true rather than aspirational.
 *   - Confidence is deliberately absent here. It appears only on families where it
 *     is semantically valid (see semantics.ts).
 */

/** Bumped only by a migration that changes canonical record shape. */
export const RECORD_SCHEMA_VERSION = 1;

/** ISO-8601 instant in UTC. Local context is carried separately. */
export const isoInstant = z.iso.datetime();

/**
 * Where a record came from. Distinct from *how* its content was established,
 * which is `provenance.method`.
 */
export const SOURCE_TYPES = [
  'user-entry',
  'user-correction',
  'system-derived',
  'device-sensor',
  'imported-legacy',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/**
 * How the content was established.
 *
 * The split below is the structural form of "an inference is never displayed as an
 * observed fact": families that record fact accept only OBSERVED_METHODS, and
 * families that record interpretation accept only DERIVED_METHODS.
 */
export const OBSERVED_METHODS = ['direct-report', 'measured', 'imported'] as const;
export const DERIVED_METHODS = ['derived', 'inferred'] as const;
export const PROVENANCE_METHODS = [...OBSERVED_METHODS, ...DERIVED_METHODS] as const;
export type ProvenanceMethod = (typeof PROVENANCE_METHODS)[number];

/** Local wall-clock context. Kept beside the instant, never instead of it. */
export const localTimeContext = z.strictObject({
  localIso: z.string().min(1),
  timeZone: z.string().min(1),
  utcOffsetMinutes: z.int().min(-1080).max(1080),
});
export type LocalTimeContext = z.infer<typeof localTimeContext>;

/**
 * A closed time window. `end` must be strictly after `start` — one of the seven
 * Phase 2 invariants.
 */
export const timeWindow = z
  .strictObject({ start: isoInstant, end: isoInstant })
  .refine((w) => Date.parse(w.end) > Date.parse(w.start), {
    message: 'Time window end must be strictly after start',
    path: ['end'],
  });
export type TimeWindow = z.infer<typeof timeWindow>;

/**
 * Provenance. Derived content **must** cite the records it was derived from:
 * an interpretation that cannot say what it was built on is not inspectable,
 * and inspectability is what the whole product rests on.
 */
function provenanceFor(methods: readonly [string, ...string[]], requireInputs: boolean) {
  const base = z.strictObject({
    method: z.enum(methods),
    derivedFromRecordIds: z.array(z.uuid()).optional(),
    note: z.string().max(500).optional(),
  });

  if (!requireInputs) return base;

  return base.refine(
    (p) => p.derivedFromRecordIds !== undefined && p.derivedFromRecordIds.length > 0,
    {
      message: 'Derived content must cite the records it was derived from',
      path: ['derivedFromRecordIds'],
    },
  );
}

export const observedProvenance = provenanceFor(OBSERVED_METHODS, false);
export const derivedProvenance = provenanceFor(DERIVED_METHODS, true);

/**
 * For the rare family that can legitimately arrive either way — a life-context
 * change may be reported by the user or detected by the system. Derived methods
 * still have to cite their inputs; reported ones do not.
 */
export const mixedProvenance = z
  .strictObject({
    method: z.enum(PROVENANCE_METHODS),
    derivedFromRecordIds: z.array(z.uuid()).optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (p) =>
      !(DERIVED_METHODS as readonly string[]).includes(p.method) ||
      (p.derivedFromRecordIds !== undefined && p.derivedFromRecordIds.length > 0),
    {
      message: 'Derived content must cite the records it was derived from',
      path: ['derivedFromRecordIds'],
    },
  );

export type EvidenceBasis = 'observed' | 'derived' | 'mixed';

/* -------------------------------------------------------------------------- */

/**
 * How sensitive a record's content is (`OWN-070`, Blueprint §15).
 *
 * Recorded at capture time rather than inferred later, because the person entering
 * a fact is the only one who reliably knows how sensitive it is, and a classifier
 * that guessed would guess wrong in the direction that matters.
 *
 * **Absence is not "public".** A record with no `privacy` field is unclassified, and
 * unclassified is treated as sensitive wherever the distinction has consequences —
 * see `classificationOf`. Phase 6 Prompt 7B builds the export consent controls that
 * consume this; Phase 7 extends it to field level. Nothing reads it as permission.
 */
export const PRIVACY_CLASSES = [
  'general',
  'health',
  'child',
  'money',
  'workplace',
  'relationship',
  'faith',
  'note',
  'location',
  'private-pattern',
] as const;
export type PrivacyClass = (typeof PRIVACY_CLASSES)[number];

/** The only class that is not treated as sensitive by default. */
export const NON_SENSITIVE_PRIVACY_CLASSES: readonly PrivacyClass[] = ['general'];

/**
 * The effective classification of a record.
 *
 * Unclassified resolves to `private-pattern` — the most protective class — so that
 * forgetting to classify fails closed rather than leaking.
 */
export function classificationOf(record: { privacy?: PrivacyClass | undefined }): PrivacyClass {
  return record.privacy ?? 'private-pattern';
}

export function isSensitive(record: { privacy?: PrivacyClass | undefined }): boolean {
  return !NON_SENSITIVE_PRIVACY_CLASSES.includes(classificationOf(record));
}

/**
 * The effective class of one field.
 *
 * A field with no override inherits the record's class. There is deliberately no way
 * for a field override to be *less* private than the record: an override that
 * loosened the record's classification would be a way to leak by accident.
 */
export function fieldClassificationOf(
  record: {
    privacy?: PrivacyClass | undefined;
    fieldPrivacy?: Record<string, PrivacyClass> | undefined;
  },
  field: string,
): PrivacyClass {
  const override = record.fieldPrivacy?.[field];
  const base = classificationOf(record);
  if (override === undefined) return base;
  // "general" is the only non-sensitive class; an override may narrow, never widen.
  return base === 'general' ? override : base === override ? override : base;
}

/**
 * Builds the envelope fields for one record family.
 *
 * `recordType` is a literal, which is the first line of defence against passing
 * one concept where another is expected: a forecast simply will not parse as an
 * outcome, whatever its other fields look like.
 */
export function envelopeShape<T extends string>(recordType: T, basis: EvidenceBasis) {
  return {
    recordId: z.uuid(),
    recordType: z.literal(recordType),
    schemaVersion: z.int().min(1),
    occurredAt: isoInstant,
    recordedAt: isoInstant,
    localTime: localTimeContext,
    source: z.enum(SOURCE_TYPES),
    provenance:
      basis === 'observed'
        ? observedProvenance
        : basis === 'derived'
          ? derivedProvenance
          : mixedProvenance,
    /**
     * How sensitive this record's content is. Optional for compatibility with
     * records written before Phase 6; unclassified is treated as most-private.
     */
    privacy: z.enum(PRIVACY_CLASSES).optional(),
    /**
     * Per-field overrides, for records whose fields differ in sensitivity.
     *
     * One record can carry a general fact and a health detail; classifying the whole
     * record at the stricter level would over-redact, and at the looser level would
     * leak. Absent fields inherit the record's class (`OWN-070`, `AT-113`).
     */
    fieldPrivacy: z.record(z.string(), z.enum(PRIVACY_CLASSES)).optional(),
    /**
     * Fields a newer version of the app wrote that this version does not understand.
     *
     * Quarantined rather than dropped. A backup taken on a later version must survive
     * a round trip through an earlier one without losing information (LEG-152) — and
     * silently discarding data the owner cannot see is the worst way to fail.
     * Restored to the top level on export.
     */
    unknownFields: z.record(z.string(), z.unknown()).optional(),
    /** The record this one replaces. Backwards-pointing only, never mutated in. */
    supersedesRecordId: z.uuid().optional(),
    /** Links the full chain of one decision episode together. */
    decisionEpisodeId: z.uuid().optional(),
  };
}

/**
 * Rules every canonical record obeys, whatever its family.
 *
 * `occurredAt <= recordedAt` holds universally because `occurredAt` is when the
 * thing the record is *about* happened or was decided — never a future date.
 * Anything genuinely in the future (a forecast horizon, a commitment due date) is
 * carried in an explicit window or horizon field, not smuggled into the envelope.
 */
export function withEnvelopeInvariants<
  S extends z.ZodType<{
    recordId: string;
    occurredAt: string;
    recordedAt: string;
    supersedesRecordId?: string | undefined;
  }>,
>(schema: S) {
  return schema
    .refine((r) => Date.parse(r.occurredAt) <= Date.parse(r.recordedAt), {
      message: 'occurredAt must not be after recordedAt',
      path: ['occurredAt'],
    })
    .refine((r) => r.supersedesRecordId !== r.recordId, {
      message: 'A record cannot supersede itself',
      path: ['supersedesRecordId'],
    });
}

/** Generates a stable, collision-resistant identifier without central coordination (ADR-0006). */
export function newRecordId(): string {
  return crypto.randomUUID();
}
