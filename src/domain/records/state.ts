import { z } from 'zod';
import { lifeCategory, trajectoryDirection } from './categories';
import { envelopeShape, timeWindow, withEnvelopeInvariants } from './envelope';
import { confidence, evidenceValue } from './semantics';

/**
 * System interpretation: what the application believes is currently true, and how
 * things are moving.
 *
 * These are the mirror image of `evidence.ts`. They carry `confidence`, they accept
 * only derived provenance, and their provenance must cite the records they were
 * built from. An observation cannot be substituted for either of them, and neither
 * can be substituted for an observation.
 */

export const inferredStateRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('inferred-state', 'derived'),
    category: lifeCategory,
    /** Plain, non-moral description of the current condition. */
    condition: evidenceValue(
      z.strictObject({
        summary: z.string().min(1).max(400),
        drivers: z.array(z.string().min(1).max(200)).min(1),
      }),
    ),
    confidence,
    /**
     * What the system does *not* know, kept explicit rather than omitted.
     * An empty array means "nothing material is unknown", which is itself a claim.
     */
    unknowns: z.array(z.string().min(1).max(200)),
    /** Attributes where credible records disagree. Reduces confidence, never hidden. */
    conflicts: z.array(
      z.strictObject({
        attribute: z.string().min(1).max(120),
        candidateRecordIds: z.array(z.uuid()).min(2),
      }),
    ),
  }),
);
export type InferredStateRecord = z.infer<typeof inferredStateRecord>;

/* -------------------------------------------------------------------------- */

/**
 * How something is developing over an explicit window.
 *
 * A trajectory is not a prediction of a future value — that is an untreated
 * forecast, which is a different family with a different record type.
 */
export const trajectoryRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('trajectory', 'derived'),
      category: lifeCategory,
      attribute: z.string().min(1).max(120),
      window: timeWindow,
      direction: trajectoryDirection,
      confidence,
      observationRecordIds: z.array(z.uuid()),
      note: z.string().max(1000).optional(),
    })
    .refine(
      (r) =>
        r.direction !== 'insufficient-evidence' ||
        r.confidence.label === 'insufficient-evidence',
      {
        message:
          'A trajectory of insufficient-evidence must carry the insufficient-evidence confidence label',
        path: ['confidence', 'label'],
      },
    )
    .refine(
      (r) => r.direction === 'insufficient-evidence' || r.observationRecordIds.length > 0,
      {
        message: 'A trajectory with a stated direction must cite the observations behind it',
        path: ['observationRecordIds'],
      },
    ),
);
export type TrajectoryRecord = z.infer<typeof trajectoryRecord>;
