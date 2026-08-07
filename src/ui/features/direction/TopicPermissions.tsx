import { Panel } from '../../components/primitives';
import {
  PERMISSIBLE_SURFACES,
  PROTECTED_TOPIC_LABELS,
  SURFACE_LABELS,
  type PermissibleSurface,
  type ProtectedTopic,
} from '../../../domain/records/permissions';

/**
 * Where one area's sensitive topics may appear (Phase 8 repair pass).
 *
 * ## Why this was extracted
 *
 * Prompt 8E built the control inside the emotional area and had it iterate **every**
 * protected topic. That was right while emotional owned the only ones. By Prompt 8H it
 * meant the switch governing whether money figures reach the weekly review, and the one
 * governing a faith practice, both lived under "Emotional state and relationships" — the
 * last place anybody would look, and a surface showing settings for areas it has nothing
 * to do with.
 *
 * Each area now renders this with its own topics. Same component, same canonical write
 * path, one place to look per area.
 *
 * ## Everything starts denied, and opening a screen is not on the list
 *
 * The surfaces are the places content could arrive **unasked**. Deliberately opening a page
 * is not one of them and never appears here, which is what `manual-only` meant in Prompt
 * 8E and still means.
 */
export function TopicPermissions({
  topics,
  grants,
  busy,
  onSetPermission,
}: {
  readonly topics: readonly ProtectedTopic[];
  readonly grants: ReadonlyMap<ProtectedTopic, readonly PermissibleSurface[]>;
  readonly busy: boolean;
  readonly onSetPermission: (
    topic: ProtectedTopic,
    surface: PermissibleSurface,
    granted: boolean,
  ) => void;
}): React.JSX.Element {
  return (
    <Panel label="Where sensitive topics may appear" wide>
      <p className="fine">
        Everything starts denied. Each of these is a place something could reach you without you
        having opened it, so each is a separate decision.
      </p>

      {topics.map((topic) => {
        const granted = grants.get(topic) ?? [];
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
  );
}

/** The topics each area owns, so no area shows settings for another's content. */
export const EMOTIONAL_TOPICS: readonly ProtectedTopic[] = [
  'private-pattern',
  'relationship-detail',
  'conflict-detail',
  'dating',
];

export const FAITH_TOPICS: readonly ProtectedTopic[] = ['faith-struggle', 'faith-practice'];

export const MONEY_TOPICS: readonly ProtectedTopic[] = ['money-figures'];
