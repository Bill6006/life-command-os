import { KeyValues, Panel } from '../../components/primitives';
import type { CanonicalRecord } from '../../../domain/records';

/**
 * Learning.
 *
 * The honest state of this destination is **empty**, and it says so with the counts
 * that prove it.
 *
 * Filling it with plausible accuracy percentages would be the easiest thing in the
 * product to fake convincingly, and exactly the false precision the Constitution
 * forbids. Nothing has been learned because no recommendation has been executed and
 * then observed through a full outcome window — and a recommendation that was
 * declined is not evidence about whether it would have helped (`LEARN-002`).
 *
 * Real learning behaviour, and `LearnedBeliefRecord`, arrive in Phase 5.
 */
export function LearningSurface({
  records,
}: {
  records: readonly CanonicalRecord[];
}): React.JSX.Element {
  const count = (type: string): number =>
    records.filter((record) => record.recordType === type).length;

  const executions = records.filter((record) => record.recordType === 'execution');
  const executed = executions.filter(
    (record) => (record as { state: string }).state === 'executed',
  ).length;

  return (
    <div className="grid">
      <Panel label="Learning" wide>
        <p className="lead">Nothing has been learned yet</p>
        <p className="body">
          Learning needs recommendations that were executed and then observed through a full
          outcome window. Until that has happened, there is nothing here that would be true.
        </p>

        <p className="panel-label">Waiting on</p>
        <KeyValues
          entries={[
            { label: 'Recommendations recorded', value: String(count('recommendation')) },
            { label: 'Executed', value: String(executed) },
            { label: 'Outcomes observed', value: String(count('outcome')) },
            { label: 'Beliefs formed', value: '0' },
          ]}
        />

        <p className="fine why">
          Forecast accuracy and recommendation effectiveness are evaluated separately, and
          neither can be judged from a recommendation that was not carried out.
        </p>
      </Panel>
    </div>
  );
}
