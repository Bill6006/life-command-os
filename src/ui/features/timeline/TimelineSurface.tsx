import { EvidenceTag, Panel } from '../../components/primitives';
import type { CanonicalRecord } from '../../../domain/records';
import { currentRecords } from '../../../domain/policies/invariants';

/**
 * Timeline — the canonical records themselves, newest first.
 *
 * Corrections appear **alongside** what they superseded rather than replacing it,
 * because append-and-supersede is only useful to a person if the interface makes the
 * earlier value visible. A record that is no longer current is marked as superseded,
 * not hidden.
 */
export function TimelineSurface({
  records,
}: {
  records: readonly CanonicalRecord[];
}): React.JSX.Element {
  const currentIds = new Set(currentRecords(records).map((record) => record.recordId));

  const ordered = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  return (
    <div className="grid">
      <Panel label="Timeline" wide>
        <p className="fine">
          Everything recorded, newest first. Corrections append rather than overwrite, so the
          earlier value stays readable.
        </p>

        {ordered.length === 0 ? (
          <p className="body">Nothing recorded yet.</p>
        ) : (
          <ol className="timeline">
            {ordered.map((record) => {
              const superseded = !currentIds.has(record.recordId);
              const observed =
                record.provenance.method === 'direct-report' ||
                record.provenance.method === 'measured' ||
                record.provenance.method === 'imported';
              return (
                <li key={record.recordId} className={`tl tl-${record.recordType}`}>
                  <div className="tl-head">
                    <span className="tl-when value">
                      {record.occurredAt.slice(0, 16).replace('T', ' ')}
                    </span>
                    <span className="tl-type">{record.recordType.replace(/-/g, ' ')}</span>
                    <EvidenceTag kind={observed ? 'observed' : 'inferred'} />
                    {superseded ? <span className="tl-type">superseded</span> : null}
                  </div>
                  <p className="change-main">{summarise(record)}</p>
                  <p className="fine">{detail(record)}</p>
                </li>
              );
            })}
          </ol>
        )}

        <p className="fine why">
          A recommendation that was declined is recorded as not executed. That is never treated
          as evidence about whether the recommendation was any good.
        </p>
      </Panel>
    </div>
  );
}

function summarise(record: CanonicalRecord): string {
  switch (record.recordType) {
    case 'observation':
    case 'observation-correction':
      return record.attribute.replace(/-/g, ' ');
    case 'context-snapshot':
      return 'Context snapshot';
    case 'goal':
      return record.statement;
    case 'commitment':
      return record.statement;
    case 'north-star':
      return record.statement;
    case 'life-context-change':
      return record.summary;
    default:
      return record.recordType.replace(/-/g, ' ');
  }
}

function detail(record: CanonicalRecord): string {
  switch (record.recordType) {
    case 'observation':
      return valueText(record.value);
    case 'observation-correction':
      return `${valueText(record.value)} — ${record.reason}`;
    case 'context-snapshot':
      return record.protectedContexts.length > 0
        ? `Protected: ${record.protectedContexts.join(', ')}`
        : 'Nothing protected';
    case 'goal':
      return `${record.category} · ${record.state}`;
    case 'commitment':
      return `${record.category} · ${record.state}${record.nonNegotiable ? ' · non-negotiable' : ''}`;
    case 'life-context-change':
      return `Affects ${record.affectedCategories.join(', ')}`;
    default:
      return record.provenance.method;
  }
}

function valueText(value: { kind: string } & Record<string, unknown>): string {
  if (value.kind === 'duration') return `${String(value['minutes'])} min`;
  if (value.kind === 'count') return String(value['count']);
  if (value.kind === 'quantity') return `${String(value['amount'])} ${String(value['unit'])}`;
  if (value.kind === 'state') return String(value['state']);
  if (value.kind === 'note') return String(value['text']);
  return value.kind;
}
