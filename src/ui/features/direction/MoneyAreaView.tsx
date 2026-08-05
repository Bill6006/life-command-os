import { useState } from 'react';
import { Panel } from '../../components/primitives';
import {
  DECISION_OUTCOMES,
  LAST_LOOKED,
  MONEY_ATTRIBUTES,
  PRESSURE_SINCE,
  RESILIENCE_BANDS,
} from '../../../domain/money/strategy';
import { scaleDefinition } from '../../../domain/records';

/**
 * Money, as a page (Prompt 8H).
 *
 * ## The gentlest question comes first
 *
 * "When did you last look at it?" opens the page, before the pressure scale and before
 * anything about cover. It is the one question here that can be answered honestly on a bad
 * month without admitting anything, and it is the fact everything else depends on —
 * readings taken by somebody who has not opened their banking app in six weeks are
 * recollections.
 *
 * ## Amounts are a separate decision, and the page says so before offering them
 *
 * The figures section is a switch and an explanation until he turns it on. Nothing else on
 * the page changes when he does: the pressure reading, the cover band, the decision, and
 * what the money is for all work identically with amounts off, which is what the plan
 * means by keeping account machinery deferred.
 */

const PRESSURE = scaleDefinition('financial-pressure');

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

export interface MoneyAreaState {
  readonly pressureLabel: string | undefined;
  readonly resilience: string | undefined;
  readonly lastLooked: string | undefined;
  readonly openDecision: string | undefined;
  readonly decisionStatement: string | undefined;
  readonly decisionMade: string | undefined;
  readonly pressureSince: string | undefined;
  readonly purpose: string | undefined;
  readonly figuresEnabled: boolean;
  readonly goalTarget: number | undefined;
  readonly goalCurrent: number | undefined;
}

export function MoneyAreaView({
  state,
  busy,
  onPressure,
  onRecord,
  onNameDecision,
  onNamePurpose,
  onFigure,
  onSetFiguresEnabled,
  onOpenGuided,
  onClose,
}: {
  readonly state: MoneyAreaState;
  readonly busy: boolean;
  readonly onPressure: (ordinal: number) => void;
  readonly onRecord: (attribute: string, value: string) => void;
  readonly onNameDecision: (statement: string) => void;
  readonly onNamePurpose: (statement: string) => void;
  readonly onFigure: (which: 'target' | 'current', amount: number, unit: string) => void;
  readonly onSetFiguresEnabled: (enabled: boolean) => void;
  readonly onOpenGuided: () => void;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [decision, setDecision] = useState('');
  const [purpose, setPurpose] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [unit, setUnit] = useState('');

  return (
    <div className="grid">
      <Panel label="Money" tone="decision" wide>
        <p className="fine">
          What is on your mind, how long you could cover things, and what you decided. This area
          holds no account, no transaction, and no view on what anything was spent on.
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

      <Panel label="Last looked" wide>
        <p className="fine">When did you last look at it?</p>
        <Choices
          label="When did you last look at it?"
          options={[...LAST_LOOKED]}
          busy={busy}
          current={state.lastLooked}
          onChoose={(option) => {
            onRecord(MONEY_ATTRIBUTES.lastLooked, option);
          }}
        />
        <p className="fine why">
          Recorded, and nothing follows from it but a two-minute suggestion. There is no version
          of this that tells you off.
        </p>
      </Panel>

      <Panel label="On your mind" wide>
        <p className="fine">{PRESSURE.prompt}</p>
        <div className="scale scale-choices" role="group" aria-label={PRESSURE.prompt}>
          {PRESSURE.anchors.map((anchor) => (
            <button
              type="button"
              key={anchor.ordinal}
              className="scale-step"
              disabled={busy}
              aria-pressed={state.pressureLabel === anchor.label}
              onClick={() => {
                onPressure(anchor.ordinal);
              }}
            >
              <span className="scale-label">{anchor.label}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel label="Cover" wide>
        <p className="fine">If money stopped coming in, how long could you cover things?</p>
        <Choices
          label="How long could you cover things?"
          options={[...RESILIENCE_BANDS]}
          busy={busy}
          current={state.resilience}
          onChoose={(option) => {
            onRecord(MONEY_ATTRIBUTES.resilience, option);
          }}
        />
        <p className="fine why">
          Bands, not a figure. This is the fact that matters and it needs no account behind it.
        </p>
      </Panel>

      <Panel label="What it is for" wide>
        {state.purpose === undefined ? (
          <>
            <p className="fine">Nothing written down yet.</p>
            <p className="field">
              <label className="fine" htmlFor="money-purpose">
                in your own words
              </label>
              <textarea
                id="money-purpose"
                className="field-input field-text"
                rows={2}
                maxLength={200}
                value={purpose}
                onChange={(event) => {
                  setPurpose(event.target.value);
                }}
              />
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || purpose.trim() === ''}
                onClick={() => {
                  onNamePurpose(purpose);
                  setPurpose('');
                }}
              >
                Write it down
              </button>
            </div>
          </>
        ) : (
          <p className="lead">{state.purpose}</p>
        )}
      </Panel>

      <Panel label="A decision you are weighing" wide>
        {state.decisionStatement === undefined ? (
          <>
            <p className="field">
              <label className="fine" htmlFor="money-decision">
                in your own words
              </label>
              <textarea
                id="money-decision"
                className="field-input field-text"
                rows={2}
                maxLength={200}
                value={decision}
                onChange={(event) => {
                  setDecision(event.target.value);
                }}
              />
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || decision.trim() === ''}
                onClick={() => {
                  onNameDecision(decision);
                  setDecision('');
                }}
              >
                Write it down
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="body">You are weighing: {state.decisionStatement}</p>
            {state.openDecision === undefined ? (
              <p className="fine">Recorded as settled.</p>
            ) : (
              <>
                <p className="fine">Did you make the call?</p>
                <Choices
                  label="Did you make the call?"
                  options={[...DECISION_OUTCOMES]}
                  busy={busy}
                  current={state.decisionMade}
                  onChoose={(option) => {
                    onRecord(MONEY_ATTRIBUTES.decisionMade, option);
                  }}
                />
                <p className="fine why">
                  Deciding against it is deciding it. Nothing here reads that as a failure.
                </p>
              </>
            )}
          </>
        )}

        {state.openDecision === undefined && state.decisionStatement !== undefined ? (
          <>
            <p className="fine">Since then, is there less on your mind about money?</p>
            <Choices
              label="Since then"
              options={[...PRESSURE_SINCE]}
              busy={busy}
              current={state.pressureSince}
              onChoose={(option) => {
                onRecord(MONEY_ATTRIBUTES.pressureSince, option);
              }}
            />
          </>
        ) : null}
      </Panel>

      {/*
        Amounts. A separate decision, explained before it is offered.
      */}
      <Panel label="Amounts" tone="quiet" wide>
        {state.figuresEnabled ? (
          <>
            <p className="fine">
              Switched on. These two numbers are the only amounts this application holds, and
              nothing else on this page depends on them.
            </p>
            <p className="field">
              <label className="fine" htmlFor="money-unit">
                what you are counting in
              </label>
              <input
                id="money-unit"
                className="field-input"
                maxLength={20}
                value={unit}
                onChange={(event) => {
                  setUnit(event.target.value);
                }}
              />
            </p>
            <p className="field">
              <label className="fine" htmlFor="money-target">
                what you are working towards
              </label>
              <input
                id="money-target"
                className="field-input"
                inputMode="numeric"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                }}
              />
            </p>
            <p className="field">
              <label className="fine" htmlFor="money-current">
                where it is now
              </label>
              <input
                id="money-current"
                className="field-input"
                inputMode="numeric"
                value={current}
                onChange={(event) => {
                  setCurrent(event.target.value);
                }}
              />
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  busy || unit.trim() === '' || (target.trim() === '' && current.trim() === '')
                }
                onClick={() => {
                  if (target.trim() !== '') onFigure('target', Number(target), unit);
                  if (current.trim() !== '') onFigure('current', Number(current), unit);
                  setTarget('');
                  setCurrent('');
                }}
              >
                Save these
              </button>
              <button
                type="button"
                className="btn btn-link"
                disabled={busy}
                onClick={() => {
                  onSetFiguresEnabled(false);
                }}
              >
                Switch amounts off
              </button>
            </div>
            {state.goalTarget === undefined ? null : (
              <p className="fine why">
                On record: {String(state.goalCurrent ?? 0)} of {String(state.goalTarget)}.
                Switching amounts off hides them and deletes nothing.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="fine">
              Switched off. Everything above works without a single number, and the app suggests
              exactly the same things either way.
            </p>
            <p className="fine why">
              Turning this on lets you put a target and a current figure against what you named.
              It is the only place amounts are held, and it is off until you say otherwise.
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => {
                  onSetFiguresEnabled(true);
                }}
              >
                Switch amounts on
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
