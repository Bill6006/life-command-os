import { useState } from 'react';
import { Panel } from '../../components/primitives';
import { implementedDomains, unimplementedDomains } from '../../../domain/domains/availability';
import type { DomainId } from '../../../domain/domains/definitions';
import type { DomainState } from '../../../domain/records/domains';
import {
  CADENCE_EXPLANATIONS,
  CADENCE_LABELS,
  COVERAGE_CADENCES,
  type CoverageCadence,
} from '../../../domain/domains/cadence';

/**
 * Manage areas — the control that makes a domain reachable.
 *
 * Every domain shipped switched off, and until this existed nothing could switch one on:
 * the only writer of a `DomainPreferenceRecord` was the synthetic scenario builder, which
 * is stripped from the production bundle. Two finished slices were therefore unreachable
 * on the deployed app while their tests passed against seeded data. This is the fix.
 *
 * ## Why the unbuilt areas are listed at all
 *
 * They could have been hidden, and the app would look like a product with two areas
 * rather than seven with five outstanding. Naming them is more honest and costs nothing,
 * **provided they cannot be switched on** — which is enforced in the command and again in
 * the registry, not by the absence of a button here.
 *
 * ## Why switching off is safe to try
 *
 * It appends a record; it deletes nothing. The panel disappears and every observation the
 * area was reading stays exactly where it is. That sentence is on screen because an owner
 * who is not sure whether "off" means "gone" will never press it.
 */
export function ManageAreasView({
  states,
  cadences,
  snoozes,
  busy,
  onSetState,
  onSetCadence,
  onSnooze,
}: {
  readonly states: ReadonlyMap<DomainId, DomainState>;
  readonly cadences: ReadonlyMap<DomainId, CoverageCadence>;
  readonly snoozes: ReadonlyMap<DomainId, string>;
  readonly busy: boolean;
  readonly onSetState: (domainId: DomainId, state: DomainState) => void;
  readonly onSetCadence: (domainId: DomainId, cadence: CoverageCadence) => void;
  readonly onSnooze: (domainId: DomainId, untilIso: string) => void;
}): React.JSX.Element {
  const available = implementedDomains();
  const notYet = unimplementedDomains();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const enabled = available.filter(
    (definition) => (states.get(definition.id) ?? 'off') !== 'off',
  ).length;

  /*
   * A summary first, and the machinery behind a disclosure (`V33-016`, v3.3 B7).
   *
   * This panel was seven areas' worth of toggles, cadence controls and snooze buttons,
   * open by default, on a surface whose job is to show what is going on across a life.
   * Management is a thing the owner does rarely and deliberately; showing all of it all of
   * the time spent most of Direction on a settings screen.
   *
   * The count stays visible because it is the one part of this that is information rather
   * than machinery — "how much of my life is this app looking at" is worth a glance.
   */
  return (
    <Panel label="Manage areas" wide>
      <p className="areas-summary">
        <span className="areas-count">{`Areas enabled: ${String(enabled)} of ${String(available.length)}`}</span>
      </p>

      {/*
        Controlled, not uncontrolled. A bare `<details>` loses its open state every time
        this panel re-renders — and toggling an area re-renders it — so the drawer slammed
        shut on the owner after every single switch. Holding the state here keeps it open
        across the write, which is what someone changing several areas actually needs.
      */}
      <details
        className="areas-drawer"
        open={drawerOpen}
        onToggle={(event) => {
          setDrawerOpen(event.currentTarget.open);
        }}
      >
        <summary>Change which areas are on</summary>

        <p className="fine">
          The parts of life this app can read for you. Each one you switch on shows a panel here
          and may offer one optional move — never on Now, which stays a single answer.
        </p>

        <ul className="areas" aria-label="Areas you can switch on">
          {available.map((definition) => {
            const state = states.get(definition.id) ?? 'disabled';
            const on = state !== 'disabled';

            return (
              <li className="area" key={definition.id}>
                <div className="area-main">
                  <span className="change-main">{definition.label}</span>
                  <span className="fine">{definition.question}</span>
                  {on ? (
                    <>
                      {/*
                      How often this area may raise something. Every option narrows; there
                      is no "more often", because a preference cannot make a question able
                      to change a decision it could not change before.
                    */}
                      <div
                        className="scale scale-choices"
                        role="group"
                        aria-label={`How often ${definition.label.toLowerCase()} may come up`}
                      >
                        {COVERAGE_CADENCES.map((option) => {
                          const chosen = (cadences.get(definition.id) ?? 'normal') === option;
                          return (
                            <button
                              type="button"
                              key={option}
                              className={`scale-step${chosen ? ' scale-step-on' : ''}`}
                              aria-pressed={chosen}
                              disabled={busy}
                              onClick={() => {
                                onSetCadence(definition.id, option);
                              }}
                            >
                              <span className="scale-label">{CADENCE_LABELS[option]}</span>
                            </button>
                          );
                        })}
                      </div>
                      <span className="fine why">
                        {CADENCE_EXPLANATIONS[cadences.get(definition.id) ?? 'normal']}
                      </span>
                      {snoozes.get(definition.id) === undefined ? (
                        <button
                          type="button"
                          className="btn btn-link"
                          disabled={busy}
                          onClick={() => {
                            const until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
                            onSnooze(definition.id, until.toISOString());
                          }}
                        >
                          Snooze for a fortnight
                        </button>
                      ) : (
                        <span className="fine">
                          Snoozed until {(snoozes.get(definition.id) ?? '').slice(0, 10)}.
                          Nothing is owed when it ends.
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`btn ${on ? 'btn-secondary' : 'btn-primary'}`}
                  disabled={busy}
                  aria-pressed={on}
                  onClick={() => {
                    onSetState(definition.id, on ? 'disabled' : 'enabled');
                  }}
                >
                  {on
                    ? `Switch off ${definition.label.toLowerCase()}`
                    : `Switch on ${definition.label.toLowerCase()}`}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="fine why">
          Switching an area off hides its panel and deletes nothing. Everything it was reading
          stays recorded, and switching it back on shows it again.
        </p>

        {/*
        Omitted entirely once every area is built, rather than left as an empty list.
        A heading over nothing is a landmark that leads somewhere blank, and "Not built
        yet" followed by a blank space reads as a loading failure rather than as
        completeness. As of Prompt 8H this is the normal state.
      */}
        {notYet.length === 0 ? null : (
          <>
            <p className="panel-label">Not built yet</p>
            <ul className="areas" aria-label="Areas that are not built yet">
              {notYet.map((definition) => (
                <li className="area" key={definition.id}>
                  <div className="area-main">
                    <span className="change-main">{definition.label}</span>
                    <span className="fine">Arrives with {definition.activatedBy}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="fine">
              These have no questions and nothing to read yet, so there is nothing to switch on.
              An empty panel would be a worse answer than this sentence.
            </p>
          </>
        )}
      </details>
    </Panel>
  );
}
