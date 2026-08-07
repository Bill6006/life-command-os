import { useState } from 'react';
import { Panel } from '../../components/primitives';
import { PromptControl } from '../guides/PromptControl';
import {
  OUTCOME_PROMPTS,
  QUICK_CAPTURE_KINDS,
  type CapturePrompt,
} from '../../../domain/prompts/definitions';
import type { Answer, AnsweredPrompt } from '../../../application/commands/capture';
import { type DeclineReason } from '../../../application/commands/decisionEpisode';
import type { QuickCaptureOption } from '../../../domain/capture/registry';
import type { DomainId } from '../../../domain/domains/definitions';

/**
 * The three short flows that hang off the decision: declining, closing a loop, and
 * writing something down.
 *
 * All three are one panel with one job. None of them is a form, and none of them can
 * be reached by accident — each is opened by a control the owner pressed.
 */

/* -------------------------------------------------------------------------- */

/**
 * Can’t Now (`OWN-033`, LEG-049).
 *
 * Every reason on this list is a **circumstance**, not a character judgement. There is
 * no "didn't feel like it", no "procrastinated", no "other (be honest)". Choosing one
 * records a constraint that changes what the app may suggest next, and the copy says
 * so plainly, because the fear this screen has to defuse is that saying no will be
 * held against you.
 */
export function DeclineSurface({
  statement,
  busy,
  reasons,
  onDecline,
  onCancel,
}: {
  readonly statement: string;
  readonly busy: boolean;
  /**
   * The few reasons the situation makes likely (`V33-029`, clarification 4).
   *
   * Chosen by `chooseDeclineReasons` rather than rendered from the whole catalogue. A
   * fifteen-item list is read rather than answered, and the app then learns whichever
   * reason was easiest to find.
   */
  readonly reasons: readonly DeclineReason[];
  readonly onDecline: (reason: DeclineReason) => void;
  readonly onCancel: () => void;
}): React.JSX.Element {
  return (
    <div className="grid">
      <Panel label="Can’t now" tone="decision" wide>
        <p className="decision-statement">{statement}</p>
        <p className="body">
          What is in the way? This becomes a constraint on what gets suggested next.
        </p>
        <div className="scale scale-choices" role="group" aria-label="What is in the way">
          {reasons.map((reason) => (
            <button
              type="button"
              key={reason.id}
              className="scale-step"
              disabled={busy}
              onClick={() => {
                onDecline(reason);
              }}
            >
              <span className="scale-label">{reason.label}</span>
              {reason.unlockedBy === undefined ? null : (
                <span className="scale-anchor">{reason.unlockedBy}</span>
              )}
            </button>
          ))}
        </div>
        <p className="fine">
          Declining is not recorded as evidence that the suggestion was wrong, and not as
          anything about you. It records what was true at the time.
        </p>
        <p className="fine">
          These are the reasons that look likely from what is already known — not a complete
          list. Anything that does not fit is “Other, or not sure”.
        </p>
        <div className="actions">
          <button type="button" className="btn btn-link" onClick={onCancel}>
            Back
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export interface OpenEpisode {
  readonly executionRecordId: string;
  readonly recommendationRecordId: string;
  readonly decisionEpisodeId: string | undefined;
  readonly openedAt: string;
  readonly statement: string;
}

/** The observable follow-ups asked for a general action, in order (`OBS-004`). */
const FOLLOW_UPS: readonly CapturePrompt[] = [
  OUTCOME_PROMPTS.completed,
  OUTCOME_PROMPTS.duration,
  OUTCOME_PROMPTS['still-interfering'],
];

/**
 * Closing a loop.
 *
 * Note what is not asked: whether it worked, whether it helped, or how it felt. The
 * questions are "did you finish", "how long", and "is the problem still in the way" —
 * three things the owner can answer by remembering. What any of it means is the
 * engine's job, and it will say `unresolved` rather than guess.
 */
export function OutcomeSurface({
  episode,
  busy,
  onSubmit,
  onCancel,
}: {
  readonly episode: OpenEpisode;
  readonly busy: boolean;
  readonly onSubmit: (answers: readonly AnsweredPrompt[]) => void;
  readonly onCancel: () => void;
}): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const collected: readonly AnsweredPrompt[] = FOLLOW_UPS.map((prompt) => ({
    prompt,
    answer: answers[prompt.promptId] ?? { kind: 'not-answered' as const },
    aboutRecordId: episode.executionRecordId,
  }));

  return (
    <div className="grid">
      <Panel label="What happened" tone="decision" wide>
        <p className="decision-statement">{episode.statement}</p>
        <p className="fine">Started {new Date(episode.openedAt).toLocaleString('en-GB')}</p>

        {FOLLOW_UPS.map((prompt) => (
          <div className="follow-up" key={prompt.promptId}>
            <p className="body">{prompt.text}</p>
            <PromptControl
              prompt={prompt}
              answer={answers[prompt.promptId]}
              onAnswer={(next) => {
                setAnswers({ ...answers, [prompt.promptId]: next });
              }}
            />
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setAnswers({ ...answers, [prompt.promptId]: { kind: 'unsure' } });
              }}
            >
              I cannot tell
            </button>
          </div>
        ))}

        <p className="fine">
          Anything you leave blank stays unresolved. It is never counted as “no effect”.
        </p>

        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => {
              onSubmit(collected);
            }}
          >
            Save
          </button>
          <button type="button" className="btn btn-link" onClick={onCancel}>
            Back
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Quick Capture — one event, written once (`OWN-063`).
 *
 * The shell only. Domain-specific captures reuse this write path in Phase 7 rather
 * than adding parallel ones, which is what stops the same fact being entered in three
 * places.
 */
export function QuickCaptureSurface({
  busy,
  domainOptions = [],
  onCapture,
  onCancel,
}: {
  readonly domainOptions?: readonly QuickCaptureOption[];
  readonly busy: boolean;
  readonly onCapture: (input: {
    readonly kind: string;
    readonly what: string;
    readonly domainId?: DomainId | undefined;
  }) => void;
  readonly onCancel: () => void;
}): React.JSX.Element {
  const [kind, setKind] = useState<string | undefined>(undefined);
  const [what, setWhat] = useState('');

  /*
   * The shared kinds, plus one per switched-on area that declared a Quick Capture
   * route. This component knows nothing about which areas exist — an area that is off
   * offers nothing, so the list stays as short as the owner's life rather than as long
   * as the roadmap.
   */
  const options: readonly {
    readonly kind: string;
    readonly domainId: DomainId | undefined;
  }[] = [
    ...QUICK_CAPTURE_KINDS.map((label) => ({ kind: label, domainId: undefined })),
    ...domainOptions,
  ];
  const chosen = options.find((option) => option.kind === kind);

  return (
    <div className="grid">
      <Panel label="Note it down" tone="decision" wide>
        <p className="body">What kind of thing was it?</p>
        <div className="scale scale-choices" role="group" aria-label="Kind of event">
          {options.map((option) => (
            <button
              type="button"
              key={option.kind}
              className={`scale-step${kind === option.kind ? ' scale-step-on' : ''}`}
              aria-pressed={kind === option.kind}
              onClick={() => {
                setKind(option.kind);
              }}
            >
              <span className="scale-label">{option.kind}</span>
            </button>
          ))}
        </div>

        <p className="body">What happened?</p>
        <p className="field">
          <label className="fine" htmlFor="capture-what">
            in your own words
          </label>
          <textarea
            id="capture-what"
            className="field-input field-text"
            rows={3}
            maxLength={500}
            value={what}
            onChange={(event) => {
              setWhat(event.target.value);
            }}
          />
        </p>
        <p className="fine">
          Stored on this device and classified as a private note. One entry, used everywhere it
          is relevant — you will not be asked for it again.
        </p>

        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || kind === undefined || what.trim() === ''}
            onClick={() => {
              if (kind !== undefined) {
                onCapture({ kind, what, domainId: chosen?.domainId });
              }
            }}
          >
            Save
          </button>
          <button type="button" className="btn btn-link" onClick={onCancel}>
            Back
          </button>
        </div>
      </Panel>
    </div>
  );
}
