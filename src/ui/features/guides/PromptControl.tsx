import { useId, useState } from 'react';
import type { CapturePrompt } from '../../../domain/prompts/definitions';
import { scaleDefinition } from '../../../domain/records/scales';
import type { Answer } from '../../../application/commands/capture';

/**
 * One question, one control (`OWN-022`).
 *
 * The rule that shapes every branch below: **nothing starts selected.** No midpoint,
 * no remembered value, no "most common answer". An untouched control is Unknown, and
 * Unknown is a different fact from every point on the scale (`OWN-024`). Pre-selecting
 * a default would manufacture evidence out of the owner not having looked.
 *
 * Free-text inputs are the only ones with a value before the owner types, and that
 * value is the empty string, which writes nothing.
 */

export interface PromptControlProps {
  readonly prompt: CapturePrompt;
  readonly answer: Answer | undefined;
  readonly onAnswer: (answer: Answer) => void;
}

export function PromptControl({
  prompt,
  answer,
  onAnswer,
}: PromptControlProps): React.JSX.Element {
  const inputId = useId();
  const [text, setText] = useState('');

  if (prompt.input.kind === 'scale') {
    const scale = scaleDefinition(prompt.input.scaleId);
    const chosen = answer?.kind === 'scale' ? answer.ordinal : undefined;
    return (
      <>
        <div className="scale" role="group" aria-label={prompt.text}>
          {scale.anchors.map((anchor) => (
            <button
              type="button"
              key={anchor.ordinal}
              className={`scale-step${chosen === anchor.ordinal ? ' scale-step-on' : ''}`}
              aria-pressed={chosen === anchor.ordinal}
              onClick={() => {
                onAnswer({ kind: 'scale', ordinal: anchor.ordinal });
              }}
            >
              <span className="scale-label">{anchor.label}</span>
            </button>
          ))}
        </div>
        <p className="fine">
          Higher means {scale.higherMeans}. Nothing is selected until you pick.
        </p>
      </>
    );
  }

  if (prompt.input.kind === 'choice') {
    const chosen = answer?.kind === 'choice' ? answer.choice : undefined;
    return (
      <div className="scale scale-choices" role="group" aria-label={prompt.text}>
        {prompt.input.options.map((option) => (
          <button
            type="button"
            key={option}
            className={`scale-step${chosen === option ? ' scale-step-on' : ''}`}
            aria-pressed={chosen === option}
            onClick={() => {
              onAnswer({ kind: 'choice', choice: option });
            }}
          >
            <span className="scale-label">{option}</span>
          </button>
        ))}
      </div>
    );
  }

  if (prompt.input.kind === 'minutes' || prompt.input.kind === 'count') {
    const unit = prompt.input.kind === 'minutes' ? 'minutes' : 'times';
    const current =
      answer?.kind === 'minutes'
        ? String(answer.minutes)
        : answer?.kind === 'count'
          ? String(answer.count)
          : '';
    return (
      <p className="field">
        <label className="fine" htmlFor={inputId}>
          {unit}
        </label>
        <input
          id={inputId}
          className="field-input"
          type="number"
          min={0}
          inputMode="numeric"
          value={current}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') {
              onAnswer({ kind: 'not-answered' });
              return;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed) || parsed < 0) return;
            onAnswer(
              prompt.input.kind === 'minutes'
                ? { kind: 'minutes', minutes: parsed }
                : { kind: 'count', count: Math.round(parsed) },
            );
          }}
        />
      </p>
    );
  }

  if (prompt.input.kind === 'clock-time') {
    const current = answer?.kind === 'clock-time' ? answer.localIso.slice(11, 16) : '';
    return (
      <p className="field">
        <label className="fine" htmlFor={inputId}>
          time
        </label>
        <input
          id={inputId}
          className="field-input"
          type="time"
          value={current}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') {
              onAnswer({ kind: 'not-answered' });
              return;
            }
            const today = new Date().toISOString().slice(0, 10);
            onAnswer({ kind: 'clock-time', localIso: `${today}T${raw}:00` });
          }}
        />
      </p>
    );
  }

  return (
    <p className="field">
      <label className="fine" htmlFor={inputId}>
        optional
      </label>
      <textarea
        id={inputId}
        className="field-input field-text"
        rows={3}
        maxLength={prompt.input.maxLength}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onAnswer(
            event.target.value.trim() === ''
              ? { kind: 'not-answered' }
              : { kind: 'text', text: event.target.value },
          );
        }}
      />
    </p>
  );
}
