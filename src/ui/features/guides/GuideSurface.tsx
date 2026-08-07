import { useState } from 'react';
import { Panel } from '../../components/primitives';
import { PromptControl } from './PromptControl';
import type { Answer, AnsweredPrompt } from '../../../application/commands/capture';
import type { GuideOutcome } from '../../../domain/records';
import { NORMAL_RESPONSE_BUDGET, type GuidePlan } from '../../../intelligence/guides/planGuide';

/**
 * A guide, one question at a time (`OWN-022`, Blueprint §6).
 *
 * The whole surface is a single panel holding a single question. That is the design:
 * a guide that showed four questions at once would be a form, and a form is the thing
 * the legacy app became. The owner answers, or does not, and moves on.
 *
 * **Stop, Snooze, and Skip are always visible and always free.** Everything already
 * answered is kept when the owner stops — nothing is discarded for being incomplete,
 * and nothing anywhere records that a guide was left early as though it mattered.
 */

export interface GuideSurfaceProps {
  readonly plan: GuidePlan;
  readonly onFinish: (
    outcome: GuideOutcome,
    answers: readonly AnsweredPrompt[],
    skippedPromptIds: readonly string[],
  ) => void;
  readonly onWeeklyStep: () => void;
  readonly onCancel: () => void;
}

const GUIDE_TITLES: Record<GuidePlan['kind'], string> = {
  morning: 'Morning',
  'morning-catch-up': 'Catching up',
  afternoon: 'Afternoon',
  evening: 'Evening',
  weekly: 'This week',
  'quick-check-in': 'Update',
  'update-area': 'Update this area',
};

export function GuideSurface({
  plan,
  onFinish,
  onWeeklyStep,
  onCancel,
}: GuideSurfaceProps): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [skipped, setSkipped] = useState<readonly string[]>([]);

  const collected = (): readonly AnsweredPrompt[] =>
    plan.steps.flatMap((step) =>
      step.kind === 'prompt'
        ? [
            {
              prompt: step.prompt,
              answer: answers[step.prompt.promptId] ?? { kind: 'not-answered' as const },
              aboutRecordId: step.aboutRecordId,
            },
          ]
        : [],
    );

  const finish = (outcome: GuideOutcome): void => {
    onFinish(outcome, collected(), skipped);
  };

  const controls = (
    <div className="actions guide-controls">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          finish('stopped');
        }}
      >
        Stop here
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          finish('skipped');
        }}
      >
        Skip
      </button>
      <button type="button" className="btn btn-link" onClick={onCancel}>
        Close
      </button>
    </div>
  );

  if (plan.steps.length === 0) {
    return (
      <div className="grid">
        <Panel label={GUIDE_TITLES[plan.kind]} tone="quiet" wide>
          <p className="decision-statement">Nothing worth asking right now</p>
          <p className="body">
            Everything this guide would ask already has a current answer. Asking again would not
            change anything, so it will not.
          </p>
          {plan.omitted.length > 0 ? (
            <ul className="changes">
              {plan.omitted.slice(0, 4).map((entry) => (
                <li key={entry.promptId}>
                  <span className="change-main">{entry.promptId}</span>
                  <span className="fine">{entry.because}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                finish('completed');
              }}
            >
              Done
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  const step = plan.steps[index];
  if (step === undefined) {
    return (
      <div className="grid">
        <Panel label={GUIDE_TITLES[plan.kind]} tone="decision" wide>
          <p className="decision-statement">That is everything</p>
          <p className="fine">
            {`${String(Object.keys(answers).length)} of ${String(plan.steps.length)} answered. Blank answers stay Unknown — they are not stored as anything.`}
          </p>
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                finish('completed');
              }}
            >
              Save and close
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  if (step.kind === 'weekly-direction') {
    onWeeklyStep();
    return (
      <div className="grid">
        <Panel label="This week" tone="decision" wide>
          <p className="body">Opening this week’s direction…</p>
        </Panel>
      </div>
    );
  }

  const { prompt } = step;
  const answer = answers[prompt.promptId];
  const last = index === plan.steps.length - 1;

  const advance = (): void => {
    if (last) {
      finish('completed');
      return;
    }
    setIndex(index + 1);
  };

  return (
    <div className="grid">
      <Panel label={GUIDE_TITLES[plan.kind]} tone="decision" wide>
        <p className="fine">
          {`Question ${String(index + 1)} of ${String(plan.steps.length)}`}
          {plan.withinNormalBudget
            ? ` · within the ${String(NORMAL_RESPONSE_BUDGET)}-response budget`
            : ' · longer than usual, because more than one answer is blocking the call'}
        </p>
        {step.context === undefined ? null : <p className="fine why">{step.context}</p>}

        <p className="decision-statement">{prompt.text}</p>

        <PromptControl
          prompt={prompt}
          answer={answer}
          onAnswer={(next) => {
            setAnswers({ ...answers, [prompt.promptId]: next });
          }}
        />

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={advance}>
            {last ? 'Save and close' : 'Next'}
          </button>
          {prompt.allowsUnknown ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setAnswers({ ...answers, [prompt.promptId]: { kind: 'unsure' } });
                advance();
              }}
            >
              Unsure
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSkipped([...skipped, prompt.promptId]);
              setAnswers({ ...answers, [prompt.promptId]: { kind: 'not-answered' } });
              advance();
            }}
          >
            Skip this
          </button>
        </div>

        <p className="fine">
          Unsure is stored as “could not tell”. Skip stores nothing at all — neither is a
          failure and neither counts against anything.
        </p>

        {controls}
      </Panel>
    </div>
  );
}
