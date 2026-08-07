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
import type { BlockedContext } from '../../../domain/records';
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
 * A standing decision about the move itself (`V33-032`, section I).
 *
 * ## Why this is a separate, second thing on the screen
 *
 * Everything above it answers "what is in the way right now" and expires by itself.
 * Everything here answers "what should this move do from now on" and does not. Putting
 * them in one list would be the interface making the same mistake the engine is built to
 * avoid: a tap meant as "not this afternoon" landing as "never".
 *
 * So it sits behind a disclosure, worded as being about the move rather than the moment,
 * and `Never suggest this` is one deliberate press inside it. Nothing here can be reached
 * by hurrying through the reasons above.
 */
export type StanceChoice =
  | { readonly kind: 'pause'; readonly days: number }
  | { readonly kind: 'block-here' }
  | { readonly kind: 'modify'; readonly statement: string }
  | { readonly kind: 'forbid' };

/** Plain-language descriptions of the situation a block would apply to. */
const CONTEXT_WORDS: Record<string, Record<string, string>> = {
  setting: {
    home: 'at home',
    work: 'at work',
    out: 'out and about',
    travelling: 'travelling',
    other: 'somewhere else',
  },
  engagement: {
    free: 'with nothing particular on',
    working: 'while working',
    'with-family': 'with family',
    eating: 'while eating',
    travelling: 'while travelling',
    'winding-down': 'while winding down',
  },
  interruptibility: {
    free: 'when you can step away',
    brief: 'when you can only step away briefly',
    none: 'when you cannot step away',
  },
  privacy: {
    private: 'when you can speak freely',
    'semi-private': 'when you can only speak quietly',
    public: 'when you are around other people',
  },
};

export function describeContext(context: BlockedContext): string {
  const parts: string[] = [];
  for (const [field, value] of Object.entries(context)) {
    if (typeof value !== 'string') continue;
    const word = CONTEXT_WORDS[field]?.[value];
    if (word !== undefined) parts.push(word);
  }
  return parts.length === 0 ? 'this situation' : parts.join(', ');
}

const PAUSE_CHOICES: readonly { readonly label: string; readonly days: number }[] = [
  { label: 'A week', days: 7 },
  { label: 'A month', days: 30 },
  { label: 'Three months', days: 90 },
];

function StanceControls({
  statement,
  busy,
  now,
  currentContext,
  onStance,
}: {
  readonly statement: string;
  readonly busy: boolean;
  /** The episode's instant, not the wall clock — rendering must stay pure and stable. */
  readonly now: Date;
  readonly currentContext: BlockedContext;
  readonly onStance: (stance: StanceChoice) => void;
}): React.JSX.Element {
  const [reword, setReword] = useState(statement);
  const [confirmForbid, setConfirmForbid] = useState(false);
  const blockable = Object.keys(currentContext).length > 0;

  return (
    <details className="stance">
      <summary>Something about this move, not just right now</summary>

      <p className="fine">
        These change what happens from now on. Nothing above this line does — those answers
        describe the moment and lift by themselves.
      </p>

      <div className="stance-group" role="group" aria-label="Pause this move">
        <p className="fine stance-label">Pause it, and it comes back on its own:</p>
        <div className="scale scale-choices">
          {PAUSE_CHOICES.map((choice) => (
            <button
              type="button"
              key={choice.label}
              className="scale-step"
              disabled={busy}
              onClick={() => {
                onStance({ kind: 'pause', days: choice.days });
              }}
            >
              <span className="scale-label">{choice.label}</span>
              <span className="scale-anchor">
                {`Back on ${new Date(now.getTime() + choice.days * 86_400_000)
                  .toISOString()
                  .slice(0, 10)}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {blockable ? (
        <div className="stance-group">
          <p className="fine stance-label">Or not in this kind of situation:</p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => {
              onStance({ kind: 'block-here' });
            }}
          >
            {`Not ${describeContext(currentContext)}`}
          </button>
          <p className="fine">
            {`Applies only ${describeContext(currentContext)}. Anywhere else it stays available.`}
          </p>
        </div>
      ) : (
        <p className="fine">
          Blocking this in one kind of situation needs the app to know what the situation is,
          and it does not yet.
        </p>
      )}

      <div className="stance-group">
        <label className="fine stance-label" htmlFor="stance-reword">
          Or say it in your own words. This changes the wording, not whether it is offered:
        </label>
        <input
          id="stance-reword"
          className="field-input"
          type="text"
          value={reword}
          maxLength={300}
          onChange={(event) => {
            setReword(event.target.value);
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || reword.trim() === '' || reword.trim() === statement}
          onClick={() => {
            onStance({ kind: 'modify', statement: reword.trim() });
          }}
        >
          Save wording
        </button>
      </div>

      <div className="stance-group stance-forbid">
        {confirmForbid ? (
          <>
            <p className="fine">
              This stops it being suggested at all, with no end date. You can put it back later
              from Direction.
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => {
                  onStance({ kind: 'forbid' });
                }}
              >
                Yes, never suggest this
              </button>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => {
                  setConfirmForbid(false);
                }}
              >
                Keep it
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-link"
            onClick={() => {
              setConfirmForbid(true);
            }}
          >
            Never suggest this
          </button>
        )}
      </div>
    </details>
  );
}

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
  currentContext,
  now,
  onDecline,
  onStance,
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
  /** How the situation reads right now, so a context block can name what it applies to. */
  readonly currentContext: BlockedContext;
  readonly now: Date;
  readonly onDecline: (reason: DeclineReason) => void;
  readonly onStance: (stance: StanceChoice) => void;
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
        <StanceControls
          statement={statement}
          busy={busy}
          now={now}
          currentContext={currentContext}
          onStance={onStance}
        />

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
