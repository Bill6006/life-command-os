import { useState } from 'react';
import { Panel } from '../../components/primitives';
import {
  ACCESS_ANSWERS,
  CONDITION_ANSWERS,
  ENVIRONMENT_PURPOSES,
  FRICTION_KINDS,
  FRICTION_OUTCOMES,
  HOME_ATTRIBUTES,
  SETUP_TIMES,
  TRANSITION_ANSWERS,
  type EnvironmentPurposeId,
} from '../../../domain/home/environment';
import type { FrictionReading } from '../../../intelligence/domains/home/assessHome';

/**
 * Home and environment, as a page (Prompt 8G).
 *
 * ## What this page is not
 *
 * It is not a list of jobs. There is no checklist, no room-by-room breakdown, no "things
 * to do", and no control anywhere that adds a second item while one is open. The only
 * free-text field on the page holds **one** change, and it is disabled while a change is
 * already open — a page that let him queue up five would be a chore app with better
 * copy.
 *
 * ## Recording friction takes two taps, on purpose
 *
 * What he was doing, then what got in the way. The first tap is what lets the chart say
 * "this happens around focused work" rather than just "this happens", and skipping it is
 * allowed — the purpose is optional everywhere and never guessed.
 */

export interface HomeAreaState {
  readonly frictions: readonly FrictionReading[];
  readonly repeated: readonly FrictionReading[];
  readonly openChange: string | undefined;
  readonly changeStatement: string | undefined;
  readonly changeMade: boolean;
  readonly frictionSince: string | undefined;
  readonly conditions: string | undefined;
  readonly access: string | undefined;
  readonly setupTime: string | undefined;
  readonly transition: string | undefined;
}

function Choices({
  label,
  options,
  busy,
  current,
  onChoose,
}: {
  readonly label: string;
  readonly options: readonly string[];
  readonly busy: boolean;
  readonly current: string | undefined;
  readonly onChoose: (option: string) => void;
}): React.JSX.Element {
  return (
    <div className="scale scale-choices" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className="scale-step"
          disabled={busy}
          aria-pressed={current === option}
          onClick={() => {
            onChoose(option);
          }}
        >
          <span className="scale-label">{option}</span>
        </button>
      ))}
    </div>
  );
}

export function HomeAreaView({
  state,
  busy,
  onRecordFriction,
  onRecord,
  onNameChange,
  onOpenGuided,
  onClose,
}: {
  readonly state: HomeAreaState;
  readonly busy: boolean;
  readonly onRecordFriction: (
    kindLabel: string,
    purpose: EnvironmentPurposeId | undefined,
  ) => void;
  readonly onRecord: (attribute: string, value: string) => void;
  readonly onNameChange: (statement: string) => void;
  readonly onOpenGuided: () => void;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [purpose, setPurpose] = useState<EnvironmentPurposeId | undefined>(undefined);
  const [change, setChange] = useState('');

  return (
    <div className="grid">
      <Panel label="Home and environment" tone="decision" wide>
        <p className="fine">
          What got in the way of something you were trying to do, and what you decided to change
          about it. This area has no view on how anything looks, and never asks.
        </p>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={onOpenGuided}>
            Take me through it instead
          </button>
          <button type="button" className="btn btn-link" onClick={onClose}>
            Done
          </button>
        </div>
      </Panel>

      <Panel label="What got in the way" wide>
        <p className="fine">What were you trying to do? (optional)</p>
        <div className="scale scale-choices" role="group" aria-label="What you were doing">
          {ENVIRONMENT_PURPOSES.map((option) => (
            <button
              type="button"
              key={option.id}
              className="scale-step"
              disabled={busy}
              aria-pressed={purpose === option.id}
              onClick={() => {
                setPurpose(purpose === option.id ? undefined : option.id);
              }}
            >
              <span className="scale-label">{option.label}</span>
            </button>
          ))}
        </div>

        <p className="fine">And what got in the way?</p>
        <div className="scale scale-choices" role="group" aria-label="What got in the way">
          {FRICTION_KINDS.map((kind) => (
            <button
              type="button"
              key={kind.id}
              className="scale-step"
              disabled={busy}
              onClick={() => {
                onRecordFriction(kind.label, purpose);
              }}
            >
              <span className="scale-label">{kind.label}</span>
            </button>
          ))}
        </div>
        <p className="fine why">
          Recorded as one occasion. Nothing is suggested from a single one — the same thing has
          to happen more than once before this says anything.
        </p>
      </Panel>

      <Panel label="What keeps happening" wide>
        {state.frictions.length === 0 ? (
          <p className="fine">Nothing recorded yet.</p>
        ) : (
          <ul className="changes" aria-label="What keeps happening">
            {state.frictions.map((reading) => (
              <li key={reading.kindId}>
                <span className="change-main">{reading.label}</span>
                <span className="fine">
                  {reading.occasions === 1
                    ? 'Once — left alone'
                    : `${String(reading.occasions)} times`}
                  {reading.purposes.length === 0
                    ? ''
                    : ` · around ${reading.purposes.join(' and ')}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel label="The one change" wide>
        {state.changeStatement === undefined ? (
          <>
            <p className="fine">Nothing decided yet.</p>
            <p className="field">
              <label className="fine" htmlFor="home-change">
                one thing to change about the setup, in your own words
              </label>
              <textarea
                id="home-change"
                className="field-input field-text"
                rows={2}
                maxLength={200}
                value={change}
                onChange={(event) => {
                  setChange(event.target.value);
                }}
              />
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || change.trim() === ''}
                onClick={() => {
                  onNameChange(change);
                  setChange('');
                }}
              >
                Write it down
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="body">You decided: {state.changeStatement}</p>
            {state.changeMade ? (
              <p className="fine">Recorded as made.</p>
            ) : (
              <>
                <p className="fine">Did you make it?</p>
                <Choices
                  label="Did you make the change?"
                  options={['Yes', 'Started it', 'No']}
                  busy={busy}
                  current={undefined}
                  onChoose={(option) => {
                    onRecord(HOME_ATTRIBUTES.changeMade, option);
                  }}
                />
              </>
            )}
            <p className="fine why">
              One at a time. Nothing else is added here while this is open.
            </p>
          </>
        )}
      </Panel>

      {state.changeMade ? (
        <Panel label="Since the change" wide>
          <p className="fine">Has the same thing got in the way again?</p>
          <Choices
            label="Since the change"
            options={[...FRICTION_OUTCOMES]}
            busy={busy}
            current={state.frictionSince}
            onChoose={(option) => {
              onRecord(HOME_ATTRIBUTES.frictionOutcome, option);
            }}
          />
          <p className="fine why">
            A change that did not hold is worth knowing. It is not read as a failure to follow
            through.
          </p>
        </Panel>
      ) : null}

      <Panel label="Noise, light, and privacy" wide>
        <Choices
          label="Noise, light, and privacy"
          options={[...CONDITION_ANSWERS]}
          busy={busy}
          current={state.conditions}
          onChoose={(option) => {
            onRecord(HOME_ATTRIBUTES.conditions, option);
          }}
        />
      </Panel>

      <Panel label="Getting started" wide>
        <p className="fine">Was what you needed where you were?</p>
        <Choices
          label="Was what you needed where you were?"
          options={[...ACCESS_ANSWERS]}
          busy={busy}
          current={state.access}
          onChoose={(option) => {
            onRecord(HOME_ATTRIBUTES.access, option);
          }}
        />
        <p className="fine">How long before you could start?</p>
        <Choices
          label="How long before you could start?"
          options={[...SETUP_TIMES]}
          busy={busy}
          current={state.setupTime}
          onChoose={(option) => {
            onRecord(HOME_ATTRIBUTES.setupTime, option);
          }}
        />
      </Panel>

      <Panel label="Switching the space over" wide>
        <p className="fine">
          When you switched it to something else, did anything have to move first?
        </p>
        <Choices
          label="Switching the space over"
          options={[...TRANSITION_ANSWERS]}
          busy={busy}
          current={state.transition}
          onChoose={(option) => {
            onRecord(HOME_ATTRIBUTES.transition, option);
          }}
        />
      </Panel>
    </div>
  );
}
