import { z } from 'zod';
import { lifeCategory } from './categories';
import { envelopeShape, withEnvelopeInvariants } from './envelope';
import { evidenceValue } from './semantics';

/**
 * Questions and answers.
 *
 * The system may ask **at most one question at a time**, and only when the answer
 * could materially change something (`UX-007`). `couldChange` requires at least one
 * entry, so a question that cannot alter state interpretation, safety, candidate
 * eligibility, the recommendation, or confidence cannot be recorded at all.
 *
 * This is the schema-level form of "no onboarding questionnaire": there is no way
 * to represent a batch of questions asked to fill out a profile.
 */

export const QUESTION_IMPACTS = [
  'state-interpretation',
  'safety',
  'candidate-eligibility',
  'recommendation',
  'confidence',
] as const;
export type QuestionImpact = (typeof QUESTION_IMPACTS)[number];

export const questionRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('question', 'derived'),
    prompt: z.string().min(1).max(300),
    category: lifeCategory,
    /** What the answer could materially change. At least one, always. */
    couldChange: z.array(z.enum(QUESTION_IMPACTS)).min(1),
    /** Why this is worth interrupting for, in the user's terms. */
    whyItMatters: z.string().min(1).max(300),
  }),
);
export type QuestionRecord = z.infer<typeof questionRecord>;

/* -------------------------------------------------------------------------- */

/**
 * The user's answer.
 *
 * Wrapped in `EvidenceValue` so that "I don't know" and "not applicable to me" are
 * recordable answers rather than missing data. Those are informative responses, and
 * flattening them into a null would discard real information.
 */
export const questionAnswerRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('question-answer', 'observed'),
    questionRecordId: z.uuid(),
    answer: evidenceValue(
      z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('text'), text: z.string().min(1).max(1000) }),
        z.strictObject({ kind: z.literal('choice'), choice: z.string().min(1).max(120) }),
        z.strictObject({
          kind: z.literal('quantity'),
          amount: z.number(),
          unit: z.string().min(1).max(40),
        }),
        z.strictObject({ kind: z.literal('boolean'), value: z.boolean() }),
      ]),
    ),
  }),
);
export type QuestionAnswerRecord = z.infer<typeof questionAnswerRecord>;
