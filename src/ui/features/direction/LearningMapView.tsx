import { useState } from 'react';
import { Panel } from '../../components/primitives';
import {
  AGE_BANDS,
  AGE_BAND_LABELS,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  type AgeBand,
  type SkillLevel,
} from '../../../domain/fatherhood/development';
import {
  PROGRESSION_RESPONSES,
  PROGRESSION_RESPONSE_LABELS,
  type ProgressionResponse,
} from '../../../domain/fatherhood/progression';
import type {
  LearningMap,
  LearningMapSkill,
  SkillHighlight,
} from '../../../intelligence/domains/fatherhood/learningMap';

/**
 * The Child Development and Learning Map (Prompt 8D.2).
 *
 * ## Why this is a page and not a guide
 *
 * A guide asks one question at a time, which is right when the app decides what is worth
 * asking. This is the opposite situation: the owner has deliberately opened the area to
 * see everything and change the one or two things that moved. Walking him through
 * twenty-seven questions to update one would be the checklist this rebuild exists to
 * end. Both interactions survive — the guided update is still there, one question at a
 * time, for when he wants to be led.
 *
 * ## Quiet by default
 *
 * Only four things are ever highlighted: newly relevant, stale, recently changed, and
 * enough evidence for a possible progression. Everything else is visible and dull. A
 * page where everything is emphasised is a page where nothing is.
 *
 * ## What it refuses to draw
 *
 * No grade, no total, no percentage, no ranking, no comparison with any other child, and
 * no summary number of any kind. There is nowhere in this component to put one.
 */

const HIGHLIGHT_LABELS: Record<SkillHighlight, string> = {
  'newly-relevant': 'New for this age',
  stale: 'Not looked at for a while',
  'recently-changed': 'Recently changed',
  'possible-progression': 'Possible progression',
};

export function LearningMapView({
  map,
  busy,
  onSetLevel,
  onRecordEvidence,
  onSetAgeBand,
  onProgressionResponse,
  onOpenGuided,
  onClose,
}: {
  readonly map: LearningMap;
  readonly busy: boolean;
  readonly onSetLevel: (skillId: string, level: SkillLevel, note: string) => void;
  readonly onRecordEvidence: (skillId: string, level: SkillLevel) => void;
  readonly onSetAgeBand: (band: AgeBand) => void;
  readonly onProgressionResponse: (
    skill: LearningMapSkill,
    response: ProgressionResponse,
  ) => void;
  readonly onOpenGuided: () => void;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [open, setOpen] = useState<string | undefined>(undefined);

  return (
    <div className="grid">
      <Panel label="Child development and learning map" tone="decision" wide>
        <p className="fine">
          Everything currently worth looking at, in one place. Change the one or two things that
          moved and leave the rest alone — nothing here needs answering.
        </p>

        <p className="panel-label">Current age band</p>
        <div className="scale scale-choices" role="group" aria-label="Current age band">
          {AGE_BANDS.map((band) => (
            <button
              type="button"
              key={band}
              className={`scale-step${map.ageBand === band ? ' scale-step-on' : ''}`}
              aria-pressed={map.ageBand === band}
              disabled={busy}
              onClick={() => {
                onSetAgeBand(band);
              }}
            >
              <span className="scale-label">{AGE_BAND_LABELS[band]}</span>
            </button>
          ))}
        </div>
        <p className="fine why">
          Changing this brings new things into view. Nothing is removed — anything already
          recorded stays exactly where it is, and stays readable.
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

      {map.sections.map((section) => (
        <Panel label={section.label} key={section.section} wide>
          {section.skills.length === 0 ? (
            <p className="fine">
              Nothing in this part of the map is relevant at the age band you chose, and nothing
              has been recorded here.
            </p>
          ) : (
            <ul className="skills" aria-label={section.label}>
              {section.skills.map((skill) => (
                <SkillRow
                  key={skill.skillId}
                  skill={skill}
                  busy={busy}
                  expanded={open === skill.skillId}
                  onToggle={() => {
                    setOpen(open === skill.skillId ? undefined : skill.skillId);
                  }}
                  onSetLevel={onSetLevel}
                  onRecordEvidence={onRecordEvidence}
                  onProgressionResponse={onProgressionResponse}
                />
              ))}
            </ul>
          )}
        </Panel>
      ))}
    </div>
  );
}

function SkillRow({
  skill,
  busy,
  expanded,
  onToggle,
  onSetLevel,
  onRecordEvidence,
  onProgressionResponse,
}: {
  readonly skill: LearningMapSkill;
  readonly busy: boolean;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onSetLevel: (skillId: string, level: SkillLevel, note: string) => void;
  readonly onRecordEvidence: (skillId: string, level: SkillLevel) => void;
  readonly onProgressionResponse: (
    skill: LearningMapSkill,
    response: ProgressionResponse,
  ) => void;
}): React.JSX.Element {
  const [note, setNote] = useState('');

  return (
    <li className={`skill${skill.highlights.length > 0 ? ' skill-highlighted' : ''}`}>
      <div className="skill-head">
        <div className="skill-main">
          <span className="change-main">{skill.label}</span>
          <span className="fine">
            {skill.levelLabel ?? 'Nothing set yet'}
            {skill.historical ? ' · kept from an earlier age band' : ''}
          </span>
          {skill.highlights.length === 0 ? null : (
            <span className="badges">
              {skill.highlights.map((highlight) => (
                <span className={`badge badge-${highlight}`} key={highlight}>
                  {HIGHLIGHT_LABELS[highlight]}
                </span>
              ))}
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          aria-expanded={expanded}
          disabled={busy}
          onClick={onToggle}
        >
          {expanded ? 'Close' : 'Update'}
        </button>
      </div>

      {skill.progression.kind === 'suggested' ? (
        <div className="suggestion">
          <p className="body">
            Suggestion: move to{' '}
            <strong>{SKILL_LEVEL_LABELS[skill.progression.to].toLowerCase()}</strong>
          </p>
          <p className="fine why">{skill.progression.because}</p>
          <div className="actions">
            {PROGRESSION_RESPONSES.map((response) => (
              <button
                type="button"
                key={response}
                className={`btn ${response === 'approve' ? 'btn-primary' : 'btn-secondary'}`}
                disabled={busy}
                onClick={() => {
                  onProgressionResponse(skill, response);
                }}
              >
                {PROGRESSION_RESPONSE_LABELS[response]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {skill.progression.kind === 'conflicting' ? (
        <p className="fine why">{skill.progression.because}</p>
      ) : null}

      {expanded ? (
        <div className="skill-update">
          <p className="fine">Where is she with this now?</p>
          <div
            className="scale scale-choices"
            role="group"
            aria-label={`Level for ${skill.label}`}
          >
            {SKILL_LEVELS.map((level) => (
              <button
                type="button"
                key={level}
                className={`scale-step${skill.level === level ? ' scale-step-on' : ''}`}
                aria-pressed={skill.level === level}
                disabled={busy}
                onClick={() => {
                  onSetLevel(skill.skillId, level, note);
                  setNote('');
                }}
              >
                <span className="scale-label">{SKILL_LEVEL_LABELS[level]}</span>
              </button>
            ))}
          </div>

          <p className="fine">Or just record what you saw this time.</p>
          <div
            className="scale scale-choices"
            role="group"
            aria-label={`What you saw for ${skill.label}`}
          >
            {SKILL_LEVELS.map((level) => (
              <button
                type="button"
                key={level}
                className="scale-step"
                disabled={busy}
                onClick={() => {
                  onRecordEvidence(skill.skillId, level);
                }}
              >
                <span className="scale-label">{SKILL_LEVEL_LABELS[level]}</span>
              </button>
            ))}
          </div>
          <p className="fine why">
            What you saw once is kept as evidence and changes nothing on its own. Several
            occasions across separate days may suggest a move, and you decide.
          </p>

          <p className="field">
            <label className="fine" htmlFor={`note-${skill.skillId}`}>
              anything worth remembering (optional)
            </label>
            <textarea
              id={`note-${skill.skillId}`}
              className="field-input field-text"
              rows={2}
              maxLength={300}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
            />
          </p>

          {skill.hasTinyLesson ? (
            <p className="fine">Tiny lesson available: {skill.lessonStatement}</p>
          ) : null}
          {skill.lastObservedAt === undefined ? null : (
            <p className="fine">
              Last recorded {skill.lastObservedAt.slice(0, 10)}
              {skill.evidenceCount === 0
                ? ''
                : ` · ${String(skill.evidenceCount)} occasion${skill.evidenceCount === 1 ? '' : 's'} on record`}
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}
