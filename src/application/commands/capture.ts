import {
  newRecordId,
  RECORD_SCHEMA_VERSION,
  type LocalTimeContext,
  type ObservedValue,
} from '../../domain/records';
import { anchorLabel, scaleDefinition } from '../../domain/records/scales';
import { UNSURE, type CapturePrompt } from '../../domain/prompts/definitions';

/**
 * Turning answers into canonical records (`OWN-061`, `ARCH-001`).
 *
 * This module is where a tap becomes a fact. Three rules it exists to hold:
 *
 *   1. **An untouched control writes nothing.** Not a zero, not a null, not a
 *      placeholder record — nothing. That is the only representation of "not
 *      reported" that cannot later be mistaken for evidence (`OWN-024`).
 *   2. **"Unsure" writes something.** Deliberately reporting that you cannot tell is
 *      information, and it is stored as its own observed value (`OBS-006`).
 *   3. **The owner's words are stored alongside the number.** A scale answer keeps
 *      its ordinal, its visible label, and the scale version, so a future rewording
 *      cannot silently change what an old record meant.
 *
 * Nothing here touches storage. It builds drafts; `writeRecord`/`writeRecords`
 * validate and persist them.
 */

/** What the owner did with one prompt. */
export type Answer =
  | { readonly kind: 'scale'; readonly ordinal: number }
  | { readonly kind: 'choice'; readonly choice: string }
  | { readonly kind: 'minutes'; readonly minutes: number }
  | { readonly kind: 'clock-time'; readonly localIso: string }
  | { readonly kind: 'count'; readonly count: number }
  | { readonly kind: 'text'; readonly text: string }
  /** Explicitly "I cannot tell". Recorded. */
  | { readonly kind: 'unsure' }
  /** Untouched or skipped. Records nothing, by design. */
  | { readonly kind: 'not-answered' };

export interface AnsweredPrompt {
  readonly prompt: CapturePrompt;
  readonly answer: Answer;
  /** The record this answer is about, when it follows one up. */
  readonly aboutRecordId?: string | undefined;
}

/**
 * Local wall-clock context beside the UTC instant.
 *
 * Both are stored because they answer different questions: the instant orders events,
 * the local time says which day the owner thinks it was.
 */
export function localTimeContextFor(now: Date): LocalTimeContext {
  const offsetMinutes = -now.getTimezoneOffset();
  const local = new Date(now.getTime() + offsetMinutes * 60_000);
  return {
    localIso: local.toISOString().slice(0, 19),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcOffsetMinutes: offsetMinutes,
  };
}

/**
 * The observed value for one answer, or `undefined` when nothing should be written.
 *
 * `not-answered` returning `undefined` is the whole point: the caller then produces
 * no record at all.
 */
export function observedValueFor(
  prompt: CapturePrompt,
  answer: Answer,
): ObservedValue | undefined {
  switch (answer.kind) {
    case 'not-answered':
      return undefined;

    case 'unsure':
      return { kind: 'unsure', about: prompt.text };

    case 'scale': {
      if (prompt.input.kind !== 'scale') return undefined;
      const label = anchorLabel(prompt.input.scaleId, answer.ordinal);
      if (label === undefined) return undefined;
      return {
        kind: 'anchored-scale',
        scaleId: prompt.input.scaleId,
        scaleVersion: scaleDefinition(prompt.input.scaleId).scaleVersion,
        ordinal: answer.ordinal,
        label,
      };
    }

    case 'choice':
      // "Unsure" offered as one of the choices means the same thing as choosing it
      // from the dedicated control, and must not be stored as an ordinary state.
      return answer.choice === UNSURE
        ? { kind: 'unsure', about: prompt.text }
        : { kind: 'state', state: answer.choice };

    case 'minutes':
      return { kind: 'duration', minutes: answer.minutes };

    case 'count':
      return { kind: 'count', count: answer.count };

    case 'clock-time':
      return { kind: 'state', state: answer.localIso };

    case 'text':
      return answer.text.trim() === '' ? undefined : { kind: 'note', text: answer.text.trim() };
  }
}

export interface ObservationDraft {
  readonly recordId: string;
  readonly draft: unknown;
}

/**
 * Builds the observation record for one answered prompt.
 *
 * Returns `undefined` when the prompt was left alone. Callers must treat that as a
 * normal result, not an error — most prompts in most sessions are left alone, and
 * that is the interaction budget working.
 */
export function observationDraft(
  entry: AnsweredPrompt,
  now: Date,
  decisionEpisodeId?: string,
): ObservationDraft | undefined {
  const value = observedValueFor(entry.prompt, entry.answer);
  if (value === undefined) return undefined;

  const recordId = newRecordId();
  const instant = now.toISOString();

  return {
    recordId,
    draft: {
      recordId,
      recordType: 'observation',
      schemaVersion: RECORD_SCHEMA_VERSION,
      occurredAt: instant,
      recordedAt: instant,
      localTime: localTimeContextFor(now),
      source: 'user-entry',
      provenance: {
        method: 'direct-report',
        ...(entry.aboutRecordId === undefined
          ? {}
          : { derivedFromRecordIds: [entry.aboutRecordId] }),
      },
      privacy: entry.prompt.privacy,
      ...(decisionEpisodeId === undefined ? {} : { decisionEpisodeId }),
      category: entry.prompt.category,
      attribute: entry.prompt.attribute,
      value,
    },
  };
}

/** Every draft an answer set produces. Unanswered prompts contribute nothing. */
export function observationDrafts(
  entries: readonly AnsweredPrompt[],
  now: Date,
  decisionEpisodeId?: string,
): readonly ObservationDraft[] {
  return entries.flatMap((entry) => {
    const draft = observationDraft(entry, now, decisionEpisodeId);
    return draft === undefined ? [] : [draft];
  });
}

/* -------------------------------------------------------------------------- */

/**
 * Sleep duration, calculated rather than asked for (`OWN-043`, LEG-097).
 *
 * Returns time **in bed**, and says so. The app does not know how much of it was
 * sleep — only a device or a sleep lab could — so it never claims to. Subtracting a
 * reported onset time is the closest honest estimate and is labelled as an estimate.
 */
export interface SleepSpan {
  readonly minutesInBed: number;
  readonly estimatedAsleepMinutes: number | undefined;
  readonly assumption: string;
}

export function sleepSpan(
  bedtimeLocalIso: string,
  wakeLocalIso: string,
  onsetMinutes?: number,
): SleepSpan | undefined {
  const bed = Date.parse(bedtimeLocalIso);
  const wake = Date.parse(wakeLocalIso);
  if (Number.isNaN(bed) || Number.isNaN(wake)) return undefined;

  // Crossing midnight is the normal case, not an error case.
  const spanMs = wake > bed ? wake - bed : wake + 24 * 60 * 60_000 - bed;
  const minutesInBed = Math.round(spanMs / 60_000);

  return {
    minutesInBed,
    estimatedAsleepMinutes:
      onsetMinutes === undefined ? undefined : Math.max(0, minutesInBed - onsetMinutes),
    assumption:
      onsetMinutes === undefined
        ? 'Time in bed. How much of it was sleep is not known.'
        : 'Time in bed less the time you reported taking to fall asleep. An estimate, not measured sleep.',
  };
}
