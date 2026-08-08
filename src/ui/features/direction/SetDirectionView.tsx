import { useState } from 'react';
import { Panel } from '../../components/primitives';
import { ENABLED_CATEGORIES, type LifeCategory } from '../../../domain/records/categories';
import { categoryLabel } from '../../view-models/present';
import type { NorthStarVersion } from '../../../intelligence/direction/northStarVersions';

/**
 * Setting a direction, compactly (`V33-003`–`V33-005`, section C).
 *
 * ## What this replaces
 *
 * "No North Star recorded yet." beside nothing that could change it. The engine has read
 * the objective function since Phase 4 and the owner had no way to write one, so the most
 * load-bearing input to every decision was reachable only by seeding a scenario.
 *
 * ## Not a wizard
 *
 * Section C says so outright, and the shape here follows: one collapsed disclosure holding
 * one text field. Nothing is required beyond a sentence, nothing asks for a horizon or a
 * target date, and the form is closed by default so a profile that already has a direction
 * spends no height on it.
 *
 * ## History is shown, not hidden behind the current value
 *
 * Revising writes a new version rather than editing the old one, and previous versions
 * stay readable with the dates they were in force. That is the visible half of `G8`: a
 * decision made in March is only explicable against the North Star that existed in March,
 * so the owner can see that the objective changed rather than wondering why old advice
 * looks strange.
 */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export interface SetDirectionProps {
  readonly versions: readonly NorthStarVersion[];
  readonly busy: boolean;
  readonly onSetNorthStar: (statement: string) => void;
  readonly onAddGoal: (statement: string, category: LifeCategory) => void;
  readonly onAddCommitment: (statement: string, category: LifeCategory) => void;
}

export function SetDirectionView({
  versions,
  busy,
  onSetNorthStar,
  onAddGoal,
  onAddCommitment,
}: SetDirectionProps): React.JSX.Element {
  const current = versions[versions.length - 1];
  const earlier = versions.slice(0, -1).reverse();

  const [starText, setStarText] = useState('');
  const [goalText, setGoalText] = useState('');
  const [goalCategory, setGoalCategory] = useState<LifeCategory>('direction-and-commitments');
  const [commitmentText, setCommitmentText] = useState('');
  const [openForm, setOpenForm] = useState<'star' | 'goal' | 'commitment' | undefined>(
    undefined,
  );

  /*
   * Controlled, and owned here. An uncontrolled `<details>` slammed shut on every write
   * earlier in this project, because a re-render resets it — the same defect would make
   * every submission here look like the form had vanished.
   */
  const toggle = (which: 'star' | 'goal' | 'commitment') => {
    setOpenForm((open) => (open === which ? undefined : which));
  };

  const submit = (action: () => void, clear: () => void) => {
    action();
    clear();
    setOpenForm(undefined);
  };

  return (
    <Panel label="Your direction" wide>
      {current === undefined ? (
        <p className="body">
          Nothing recorded yet. A North Star is one sentence about what this is all for — it is
          what every suggestion gets weighed against.
        </p>
      ) : (
        <>
          <p className="lead">{current.statement}</p>
          <p className="fine">Set {formatDate(current.effectiveFrom)}</p>
        </>
      )}

      <div className="direction-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          aria-expanded={openForm === 'star'}
          onClick={() => {
            toggle('star');
          }}
        >
          {current === undefined ? 'Set a North Star' : 'Revise it'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          aria-expanded={openForm === 'goal'}
          onClick={() => {
            toggle('goal');
          }}
        >
          Add a goal
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          aria-expanded={openForm === 'commitment'}
          onClick={() => {
            toggle('commitment');
          }}
        >
          Add a commitment
        </button>
      </div>

      {openForm === 'star' ? (
        <form
          className="direction-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (starText.trim().length === 0) return;
            submit(
              () => {
                onSetNorthStar(starText);
              },
              () => {
                setStarText('');
              },
            );
          }}
        >
          <label htmlFor="north-star-statement">What is this all for?</label>
          <textarea
            className="field-input field-text"
            id="north-star-statement"
            rows={2}
            value={starText}
            maxLength={500}
            onChange={(event) => {
              setStarText(event.target.value);
            }}
          />
          {/*
            Said plainly, because the alternative is somebody hesitating over a text box
            for a fortnight. Revising is cheap and the old version is kept.
          */}
          <p className="fine">
            You can change this whenever you like. Earlier versions are kept with their dates,
            so past suggestions still make sense.
          </p>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || starText.trim().length === 0}
          >
            Save
          </button>
        </form>
      ) : null}

      {openForm === 'goal' ? (
        <form
          className="direction-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (goalText.trim().length === 0) return;
            submit(
              () => {
                onAddGoal(goalText, goalCategory);
              },
              () => {
                setGoalText('');
              },
            );
          }}
        >
          <label htmlFor="goal-statement">What are you working towards?</label>
          <input
            className="field-input"
            id="goal-statement"
            type="text"
            value={goalText}
            maxLength={500}
            onChange={(event) => {
              setGoalText(event.target.value);
            }}
          />
          <label htmlFor="goal-category">Which part of life</label>
          <select
            className="field-input"
            id="goal-category"
            value={goalCategory}
            onChange={(event) => {
              setGoalCategory(event.target.value as LifeCategory);
            }}
          >
            {ENABLED_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || goalText.trim().length === 0}
          >
            Save
          </button>
        </form>
      ) : null}

      {openForm === 'commitment' ? (
        <form
          className="direction-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (commitmentText.trim().length === 0) return;
            submit(
              () => {
                onAddCommitment(commitmentText, goalCategory);
              },
              () => {
                setCommitmentText('');
              },
            );
          }}
        >
          <label htmlFor="commitment-statement">What have you committed to?</label>
          <input
            className="field-input"
            id="commitment-statement"
            type="text"
            value={commitmentText}
            maxLength={500}
            onChange={(event) => {
              setCommitmentText(event.target.value);
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || commitmentText.trim().length === 0}
          >
            Save
          </button>
        </form>
      ) : null}

      {earlier.length === 0 ? null : (
        <details className="direction-history">
          <summary>Earlier versions ({earlier.length})</summary>
          <ul className="goals">
            {earlier.map((version) => (
              <li key={version.recordId}>
                <span className="change-main">{version.statement}</span>
                <span className="fine">
                  {formatDate(version.effectiveFrom)} –{' '}
                  {version.effectiveUntil === undefined
                    ? 'now'
                    : formatDate(version.effectiveUntil)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}
