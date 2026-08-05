import { useState } from 'react';
import { Panel } from '../../components/primitives';
import { FAITH_ATTRIBUTES, PRACTICE_OUTCOMES } from '../../../domain/faith/meaning';
import type { FaithAnchorKind } from '../../../domain/records/faith';
import type { PracticeReading } from '../../../intelligence/domains/faith/assessFaith';

/**
 * Faith and meaning, as a page (Prompt 8F).
 *
 * ## The blank field is the feature
 *
 * Every other area page in this product offers choices: rungs, practices, connection
 * kinds. This one offers an empty box and a heading. There is no starter list of values,
 * no suggested practice, and no example placeholder text — because any of those would be
 * this application telling a person what a life should contain.
 *
 * Once he has named something, everything after that **is** a button: recording an
 * occasion, marking a repair done, retiring a practice. Structured controls before free
 * text, as the shared rules require — the free text is only ever for the words that must
 * be his.
 *
 * ## What is deliberately not drawn
 *
 * No streak, no calendar of dots, no consistency figure, no ordering of practices by how
 * often they were kept, and no encouragement. A practice with nothing recorded looks
 * exactly like one recorded yesterday, except for the count beside it.
 */

const OUTCOME_LABELS = PRACTICE_OUTCOMES.map((outcome) => outcome.label);

export interface FaithAreaState {
  readonly values: readonly { readonly recordId: string; readonly statement: string }[];
  readonly purpose: string | undefined;
  readonly practices: readonly PracticeReading[];
  readonly openRepair: string | undefined;
  readonly repairDone: boolean;
  readonly struggleCount: number;
}

function NameSomething({
  label,
  hint,
  busy,
  onName,
}: {
  readonly label: string;
  readonly hint: string;
  readonly busy: boolean;
  readonly onName: (statement: string) => void;
}): React.JSX.Element {
  const [text, setText] = useState('');
  const id = `name-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;

  return (
    <>
      <p className="field">
        <label className="fine" htmlFor={id}>
          {hint}
        </label>
        <textarea
          id={id}
          className="field-input field-text"
          rows={2}
          maxLength={300}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </p>
      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || text.trim() === ''}
          onClick={() => {
            onName(text);
            setText('');
          }}
        >
          {label}
        </button>
      </div>
    </>
  );
}

export function FaithAreaView({
  state,
  busy,
  onName,
  onRetire,
  onRecordOccasion,
  onRecord,
  onStruggle,
  onOpenGuided,
  onClose,
}: {
  readonly state: FaithAreaState;
  readonly busy: boolean;
  readonly onName: (kind: FaithAnchorKind, statement: string) => void;
  readonly onRetire: (practice: PracticeReading) => void;
  readonly onRecordOccasion: (practice: PracticeReading, outcome: string) => void;
  readonly onRecord: (attribute: string, state?: string, text?: string) => void;
  readonly onStruggle: (text: string) => void;
  readonly onOpenGuided: () => void;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [struggle, setStruggle] = useState('');
  const [showStruggle, setShowStruggle] = useState(false);

  const activePractices = state.practices.filter((practice) => practice.state === 'active');
  const retired = state.practices.filter((practice) => practice.state === 'retired');

  return (
    <div className="grid">
      <Panel label="Faith and meaning" tone="decision" wide>
        <p className="fine">
          Your words, and what you recorded against them. This area has no view on any of it —
          it will never suggest what should matter to you, and never tell you how you are doing.
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

      <Panel label="What matters" wide>
        {state.values.length === 0 ? (
          <p className="fine">Nothing written down yet.</p>
        ) : (
          <ul className="changes" aria-label="What matters">
            {state.values.map((value) => (
              <li key={value.recordId}>
                <span className="change-main">{value.statement}</span>
              </li>
            ))}
          </ul>
        )}
        <NameSomething
          label="Add"
          hint="in your own words"
          busy={busy}
          onName={(statement) => {
            onName('value', statement);
          }}
        />
      </Panel>

      <Panel label="Why it matters" wide>
        {state.purpose === undefined ? (
          <>
            <p className="fine">Nothing written down yet.</p>
            <NameSomething
              label="Write it down"
              hint="in your own words"
              busy={busy}
              onName={(statement) => {
                onName('purpose', statement);
              }}
            />
          </>
        ) : (
          <p className="lead">{state.purpose}</p>
        )}
      </Panel>

      <Panel label="Things you do about it" wide>
        {activePractices.length === 0 ? (
          <p className="fine">Nothing named yet.</p>
        ) : (
          <ul className="skills" aria-label="Things you do about it">
            {activePractices.map((practice) => (
              <li className="skill" key={practice.recordId}>
                <div className="skill-head">
                  <div className="skill-main">
                    <span className="change-main">{practice.statement}</span>
                    <span className="fine">
                      {practice.occasions === 0
                        ? 'Nothing recorded against this yet'
                        : `${String(practice.occasions)} occasion${practice.occasions === 1 ? '' : 's'} recorded`}
                      {practice.serves === undefined ? '' : ` · for "${practice.serves}"`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-link"
                    disabled={busy}
                    onClick={() => {
                      onRetire(practice);
                    }}
                  >
                    Retire
                  </button>
                </div>
                <div
                  className="scale scale-choices"
                  role="group"
                  aria-label={`Record an occasion of ${practice.statement}`}
                >
                  {OUTCOME_LABELS.map((outcome) => (
                    <button
                      type="button"
                      key={outcome}
                      className="scale-step"
                      disabled={busy}
                      onClick={() => {
                        onRecordOccasion(practice, outcome);
                      }}
                    >
                      <span className="scale-label">{outcome}</span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        <NameSomething
          label="Add something you do"
          hint="in your own words"
          busy={busy}
          onName={(statement) => {
            onName('practice', statement);
          }}
        />

        {retired.length === 0 ? null : (
          <p className="fine why">
            {retired.length} retired, kept with everything recorded against{' '}
            {retired.length === 1 ? 'it' : 'them'}. Stopping something is not a gap.
          </p>
        )}
      </Panel>

      <Panel label="For someone else" wide>
        <p className="fine">Did you do the thing for someone else?</p>
        <div className="scale scale-choices" role="group" aria-label="For someone else">
          {['Yes', 'Partly', 'No'].map((option) => (
            <button
              type="button"
              key={option}
              className="scale-step"
              disabled={busy}
              onClick={() => {
                onRecord(FAITH_ATTRIBUTES.serviceHappened, option);
              }}
            >
              <span className="scale-label">{option}</span>
            </button>
          ))}
        </div>
        <p className="fine why">Counted as occasions. Nobody needs to know about it.</p>
      </Panel>

      <Panel label="Something to put right" wide>
        {state.openRepair === undefined ? (
          <NameSomething
            label="Write it down"
            hint="what you decided to put right"
            busy={busy}
            onName={(statement) => {
              onRecord(FAITH_ATTRIBUTES.repairNeeded, undefined, statement);
            }}
          />
        ) : (
          <>
            <p className="body">You decided: {state.openRepair}</p>
            {state.repairDone ? (
              <p className="fine">Recorded as done.</p>
            ) : (
              <div className="scale scale-choices" role="group" aria-label="Did you do it?">
                {['Yes', 'Started it', 'No'].map((option) => (
                  <button
                    type="button"
                    key={option}
                    className="scale-step"
                    disabled={busy}
                    onClick={() => {
                      onRecord(FAITH_ATTRIBUTES.repairHappened, option);
                    }}
                  >
                    <span className="scale-label">{option}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Panel>

      {/*
        Doubt and difficulty. Behind a control, never suggested, and read by nothing.
      */}
      <Panel label="How this is going" tone="quiet" wide>
        <p className="fine">
          Somewhere to write down how it is actually going, including when that is badly.
          Nothing reads this. It changes nothing, suggests nothing, and never appears anywhere
          you have not opened.
        </p>

        {showStruggle ? (
          <>
            <p className="field">
              <label className="fine" htmlFor="faith-struggle">
                in your own words (optional)
              </label>
              <textarea
                id="faith-struggle"
                className="field-input field-text"
                rows={4}
                maxLength={2000}
                value={struggle}
                onChange={(event) => {
                  setStruggle(event.target.value);
                }}
              />
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || struggle.trim() === ''}
                onClick={() => {
                  onStruggle(struggle);
                  setStruggle('');
                }}
              >
                Keep this
              </button>
            </div>
          </>
        ) : (
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                setShowStruggle(true);
              }}
            >
              Write something down
            </button>
          </div>
        )}

        {state.struggleCount === 0 ? null : (
          <p className="fine why">
            {state.struggleCount} kept here. Nothing has been done with any of them.
          </p>
        )}
      </Panel>
    </div>
  );
}
