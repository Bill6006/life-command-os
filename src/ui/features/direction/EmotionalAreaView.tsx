import { useState } from 'react';
import { Panel } from '../../components/primitives';
import {
  BOUNDARY_OUTCOMES,
  CONNECTION_KINDS,
  EMOTIONAL_ATTRIBUTES,
  REJECTION_RESPONSES,
  REPAIR_OUTCOMES,
  SOCIAL_PRACTICES,
} from '../../../domain/emotional/social';
import {
  PERMISSIBLE_SURFACES,
  PROTECTED_TOPICS,
  PROTECTED_TOPIC_LABELS,
  SURFACE_LABELS,
  type PermissibleSurface,
  type ProtectedTopic,
} from '../../../domain/records/permissions';

/**
 * Emotional state and relationships, as a page rather than a queue (Prompt 8E).
 *
 * Same separation the learning map established: a guide asks one thing at a time when
 * the app is choosing what to ask; this is the owner deliberately opening an area to
 * update the two things that changed.
 *
 * ## The part that is off unless he says otherwise
 *
 * Private Patterns sits at the bottom, switched off, behind its own control, and shows
 * nothing at all until it is on. Turning it on is consent to *record* — never consent to
 * be shown anything anywhere else. Where it may appear is a second, separate set of
 * decisions, one surface at a time, and all four start denied.
 *
 * ## What is deliberately absent
 *
 * No person. No contact list, no name field, no per-relationship history, and nothing
 * that could grow into one. Every control below records what the **owner** did.
 */

const CONNECTION_LABELS = CONNECTION_KINDS.map((kind) => kind.label);
const PRACTICE_LABELS = SOCIAL_PRACTICES.map((practice) => practice.label);
const BOUNDARY_LABELS = BOUNDARY_OUTCOMES.map((outcome) => outcome.label);
const REPAIR_LABELS = REPAIR_OUTCOMES.map((outcome) => outcome.label);
const REJECTION_LABELS = REJECTION_RESPONSES.map((response) => response.label);

export interface EmotionalAreaState {
  readonly enabledTopics: readonly ProtectedTopic[];
  readonly grants: ReadonlyMap<ProtectedTopic, readonly PermissibleSurface[]>;
  readonly conflictOpen: boolean;
  readonly openBoundary: string | undefined;
}

function ChoiceRow({
  label,
  options,
  busy,
  onChoose,
}: {
  readonly label: string;
  readonly options: readonly string[];
  readonly busy: boolean;
  readonly onChoose: (choice: string) => void;
}): React.JSX.Element {
  return (
    <>
      <p className="fine">{label}</p>
      <div className="scale scale-choices" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            key={option}
            className="scale-step"
            disabled={busy}
            onClick={() => {
              onChoose(option);
            }}
          >
            <span className="scale-label">{option}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function EmotionalAreaView({
  state,
  busy,
  onRecord,
  onRecordBoundary,
  onPrivateNote,
  onSetTopicEnabled,
  onSetPermission,
  onOpenGuided,
  onClose,
}: {
  readonly state: EmotionalAreaState;
  readonly busy: boolean;
  readonly onRecord: (attribute: string, choice: string) => void;
  readonly onRecordBoundary: (text: string) => void;
  readonly onPrivateNote: (text: string) => void;
  readonly onSetTopicEnabled: (topic: ProtectedTopic, enabled: boolean) => void;
  readonly onSetPermission: (
    topic: ProtectedTopic,
    surface: PermissibleSurface,
    granted: boolean,
  ) => void;
  readonly onOpenGuided: () => void;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [boundary, setBoundary] = useState('');
  const [note, setNote] = useState('');

  const privateOn = state.enabledTopics.includes('private-pattern');

  return (
    <div className="grid">
      <Panel label="Emotional state and relationships" tone="decision" wide>
        <p className="fine">
          What you did and what is in the way. Nothing here records anything about another
          person, and nothing needs answering.
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

      <Panel label="Connection" wide>
        <ChoiceRow
          label="Have you spent time with anyone since last time?"
          options={CONNECTION_LABELS}
          busy={busy}
          onChoose={(choice) => {
            onRecord(EMOTIONAL_ATTRIBUTES.connection, choice);
          }}
        />
        <p className="fine why">
          Counted as days with contact, never as a target and never compared with anyone.
        </p>
      </Panel>

      <Panel label="What you practised" wide>
        <ChoiceRow
          label="Did you do any of these since last time?"
          options={PRACTICE_LABELS}
          busy={busy}
          onChoose={(choice) => {
            onRecord(EMOTIONAL_ATTRIBUTES.practice, choice);
          }}
        />
        <p className="fine why">
          Attempts are recorded. How the other person responded is not — it is not yours to
          record, and it is not what you were practising.
        </p>
      </Panel>

      <Panel label="Boundaries" wide>
        {state.openBoundary === undefined ? (
          <>
            <p className="fine">What did you decide to do, or not do?</p>
            <p className="field">
              <label className="fine" htmlFor="boundary-text">
                in your own words
              </label>
              <textarea
                id="boundary-text"
                className="field-input field-text"
                rows={2}
                maxLength={200}
                value={boundary}
                onChange={(event) => {
                  setBoundary(event.target.value);
                }}
              />
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || boundary.trim() === ''}
                onClick={() => {
                  onRecordBoundary(boundary);
                  setBoundary('');
                }}
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="body">You decided: {state.openBoundary}</p>
            <ChoiceRow
              label="Did that happen?"
              options={BOUNDARY_LABELS}
              busy={busy}
              onChoose={(choice) => {
                onRecord(EMOTIONAL_ATTRIBUTES.boundaryOutcome, choice);
              }}
            />
          </>
        )}
      </Panel>

      <Panel label="Conflict and repair" wide>
        <ChoiceRow
          label="Is anything still unresolved with someone?"
          options={['Yes', 'No', 'Unsure']}
          busy={busy}
          onChoose={(choice) => {
            onRecord(EMOTIONAL_ATTRIBUTES.conflictOpen, choice);
          }}
        />
        {state.conflictOpen ? (
          <ChoiceRow
            label="Has either of you been back in touch since?"
            options={REPAIR_LABELS}
            busy={busy}
            onChoose={(choice) => {
              onRecord(EMOTIONAL_ATTRIBUTES.repairOutcome, choice);
            }}
          />
        ) : null}
        <p className="fine why">
          Only whether contact happened. What was said, and what either of you meant by it, is
          not recorded anywhere.
        </p>
      </Panel>

      <Panel label="After a knock-back" wide>
        <ChoiceRow
          label="Since something did not go your way, have you tried anything similar again?"
          options={REJECTION_LABELS}
          busy={busy}
          onChoose={(choice) => {
            onRecord(EMOTIONAL_ATTRIBUTES.rejectionResponse, choice);
          }}
        />
        <p className="fine why">
          Recovery is measured by whether you went again, not by how you took it.
        </p>
      </Panel>

      {/*
        The protected section. Off unless switched on, and silent while it is off — the
        heading says what it is and nothing more.
      */}
      <Panel label="Private patterns" tone="quiet" wide>
        <p className="fine">
          A private place to record something you would not want anywhere else. Off by default,
          never suggested, and never shown unless you open it.
        </p>

        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            aria-pressed={privateOn}
            disabled={busy}
            onClick={() => {
              onSetTopicEnabled('private-pattern', !privateOn);
            }}
          >
            {privateOn ? 'Switch private patterns off' : 'Switch private patterns on'}
          </button>
        </div>

        {privateOn ? (
          <>
            <p className="field">
              <label className="fine" htmlFor="private-note">
                anything you want to keep a note of (optional)
              </label>
              <textarea
                id="private-note"
                className="field-input field-text"
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                }}
              />
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || note.trim() === ''}
                onClick={() => {
                  onPrivateNote(note);
                  setNote('');
                }}
              >
                Save privately
              </button>
            </div>
            <p className="fine why">
              Stored on this device and classified as the most private class there is. It stays
              out of every readable export unless you separately allow it below.
            </p>
          </>
        ) : (
          <p className="fine">Switched off. Nothing is recorded and nothing is shown.</p>
        )}
      </Panel>

      <Panel label="Where sensitive topics may appear" wide>
        <p className="fine">
          Everything starts denied. Each of these is a place something could reach you without
          you having opened it, so each is a separate decision.
        </p>

        {PROTECTED_TOPICS.map((topic) => {
          const granted = state.grants.get(topic) ?? [];
          return (
            <div className="permission" key={topic}>
              <p className="panel-label">{PROTECTED_TOPIC_LABELS[topic]}</p>
              <div
                className="scale scale-choices"
                role="group"
                aria-label={`Where ${PROTECTED_TOPIC_LABELS[topic].toLowerCase()} may appear`}
              >
                {PERMISSIBLE_SURFACES.map((surface) => {
                  const on = granted.includes(surface);
                  return (
                    <button
                      type="button"
                      key={surface}
                      className={`scale-step${on ? ' scale-step-on' : ''}`}
                      aria-pressed={on}
                      disabled={busy}
                      onClick={() => {
                        onSetPermission(topic, surface, !on);
                      }}
                    >
                      <span className="scale-label">{SURFACE_LABELS[surface]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p className="fine why">
          Opening a screen yourself is not on this list. These are the places the app could show
          something you did not ask for, which is why none of them is on.
        </p>
      </Panel>
    </div>
  );
}
