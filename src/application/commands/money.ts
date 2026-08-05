import { newRecordId, RECORD_SCHEMA_VERSION, scaleDefinition } from '../../domain/records';
import { MONEY_ATTRIBUTES } from '../../domain/money/strategy';
import { localTimeContextFor } from './capture';
import { writeRecord, type WriteResult } from './writeRecord';

/**
 * Writes from the money area (Prompt 8H).
 *
 * ## The figures cannot be written without the topic being on
 *
 * `recordGoalFigure` refuses when `figuresEnabled` is false. The interface already hides
 * the controls, and the candidate generator never reads the amounts — but a deferral the
 * plan states as a scope boundary deserves a refusal at the write path too. A boundary
 * enforced only where it happens to be convenient is a boundary until somebody adds a
 * screen.
 */

function envelopeFor(now: Date) {
  const instant = now.toISOString();
  return {
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry' as const,
    provenance: { method: 'direct-report' as const },
    privacy: 'money' as const,
  };
}

function observation(
  attribute: string,
  value:
    | { kind: 'state'; state: string }
    | { kind: 'note'; text: string }
    | { kind: 'quantity'; amount: number; unit: string }
    | {
        kind: 'anchored-scale';
        scaleId: 'financial-pressure';
        scaleVersion: number;
        ordinal: number;
        label: string;
      },
  now: Date,
) {
  return {
    ...envelopeFor(now),
    recordId: newRecordId(),
    recordType: 'observation' as const,
    category: 'money' as const,
    attribute,
    value,
  };
}

/**
 * How much is on his mind, as an anchored reading.
 *
 * Written through the shared scale so the ordinal and the label cannot disagree, and
 * stored under `state:financial-pressure` — the same attribute whatever surface collected
 * it, which is what makes one event one canonical record.
 */
export async function recordFinancialPressure(
  ordinal: number,
  now: Date,
): Promise<WriteResult> {
  const definition = scaleDefinition('financial-pressure');
  const anchor = definition.anchors.find((entry) => entry.ordinal === ordinal);
  if (anchor === undefined) {
    return {
      ok: false,
      reason: 'schema-violation',
      issues: ['That is not a point on the scale'],
    };
  }

  return writeRecord(
    observation(
      MONEY_ATTRIBUTES.pressure,
      {
        kind: 'anchored-scale',
        scaleId: 'financial-pressure',
        scaleVersion: definition.scaleVersion,
        ordinal: anchor.ordinal,
        label: anchor.label,
      },
      now,
    ),
  );
}

/** Resilience, when he last looked, whether the call was made, and what moved since. */
export async function recordMoneyState(
  input: { readonly attribute: string; readonly state: string },
  now: Date,
): Promise<WriteResult> {
  return writeRecord(observation(input.attribute, { kind: 'state', state: input.state }, now));
}

/** A decision he is weighing, in his words. */
export async function nameMoneyDecision(text: string, now: Date): Promise<WriteResult> {
  const statement = text.trim();
  if (statement === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was written down'] };
  }
  return writeRecord(
    observation(MONEY_ATTRIBUTES.decisionNamed, { kind: 'note', text: statement }, now),
  );
}

/** What the money is for. A goal, filed like every other goal. */
export async function nameMoneyPurpose(text: string, now: Date): Promise<WriteResult> {
  const statement = text.trim();
  if (statement === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was written down'] };
  }

  return writeRecord({
    ...envelopeFor(now),
    recordId: newRecordId(),
    recordType: 'goal',
    statement,
    category: 'money',
    state: 'active',
    progressEvidenceIntent: 'What you record against it, in your own words',
  });
}

/**
 * A figure, and the one write in this domain that can be refused on principle.
 *
 * The plan defers account machinery "unless separately activated". `figuresEnabled` is
 * that activation, read from the owner's own decision and passed in by the caller so the
 * refusal cannot disagree with what he is looking at.
 */
export async function recordGoalFigure(
  input: {
    readonly which: 'target' | 'current';
    readonly amount: number;
    readonly unit: string;
    readonly figuresEnabled: boolean;
  },
  now: Date,
): Promise<WriteResult> {
  if (!input.figuresEnabled) {
    return {
      ok: false,
      reason: 'schema-violation',
      issues: ['Amounts are switched off. Switch them on before recording one.'],
    };
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return { ok: false, reason: 'schema-violation', issues: ['That is not an amount'] };
  }
  const unit = input.unit.trim();
  if (unit === '') {
    return {
      ok: false,
      reason: 'schema-violation',
      issues: ['A number with no unit means nothing'],
    };
  }

  return writeRecord(
    observation(
      input.which === 'target' ? MONEY_ATTRIBUTES.goalTarget : MONEY_ATTRIBUTES.goalCurrent,
      { kind: 'quantity', amount: input.amount, unit },
      now,
    ),
  );
}

/**
 * Something that happened, through Quick Capture.
 *
 * Free text, `money`-classified, and never quoted on Now — the general rule from Prompt
 * 8F, which by now has held for three domains without being edited.
 */
export async function recordMoneyEvent(text: string, now: Date): Promise<WriteResult> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was written down'] };
  }
  return writeRecord(observation(MONEY_ATTRIBUTES.event, { kind: 'note', text: trimmed }, now));
}
