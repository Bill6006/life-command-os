import { useEffect, useMemo, useState } from 'react';
import { NowSurface, type InterfaceState, type NowView } from '../now/NowSurface';
import { TimelineSurface } from '../timeline/TimelineSurface';
import { DirectionSurface } from '../direction/DirectionSurface';
import { CommitmentsSurface } from '../commitments/CommitmentsSurface';
import { LearningSurface } from '../learning/LearningSurface';
import { DataPrivacySurface } from '../data-privacy/DataPrivacySurface';
import { GuideSurface } from '../guides/GuideSurface';
import {
  DeclineSurface,
  OutcomeSurface,
  QuickCaptureSurface,
  type OpenEpisode,
} from '../respond/RespondSurfaces';
import { useLocalRecords } from '../../state/useLocalRecords';
import type { GuideDepth, GuideKind, GuideOutcome } from '../../../domain/records';
import type { AnsweredPrompt } from '../../../application/commands/capture';
import {
  declineRecommendation,
  openEpisodes,
  recordOutcome,
  startRecommendation,
  type DeclineReason,
} from '../../../application/commands/decisionEpisode';
import {
  completeGuideSession,
  quickCapture,
  respondToWeeklyDirection,
  type WeeklyResponse,
} from '../../../application/commands/guideSession';
import {
  DEFAULT_DEPTH,
  isLateMorning,
  planGuide,
  suggestedGuide,
} from '../../../intelligence/guides/planGuide';
import '../../design-system/console.css';

/**
 * The Console shell (ADR-0008), now driven by real local records.
 *
 * **The scenario picker is gone.** Through Phase 5 this shell chose a set of synthetic
 * records and asked the engine to reason over them; from Phase 6 it reads what is
 * actually stored in IndexedDB, and the controls write back. The synthetic scenarios
 * still exist and the tests still use them — they are seeded through the test bridge
 * rather than offered to the owner as a menu.
 *
 * Six logical destinations. **Five persistent on mobile** — Learning and Data &
 * Privacy live under More, per `UX-010` — and all six on the desktop rail.
 *
 * Every write here goes through the application layer. This component knows nothing
 * about IndexedDB, cannot import it, and would fail lint if it tried.
 */

type Destination =
  'now' | 'timeline' | 'direction' | 'commitments' | 'learning' | 'data-privacy';

/** What the owner is doing right now. Only one flow is ever open. */
type Mode =
  | { readonly kind: 'console' }
  | { readonly kind: 'guide'; readonly guide: GuideKind; readonly depth: GuideDepth }
  | { readonly kind: 'decline' }
  | { readonly kind: 'outcome'; readonly episode: OpenEpisode }
  | { readonly kind: 'capture' };

const PRIMARY: readonly { id: Destination; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'direction', label: 'Direction' },
  { id: 'commitments', label: 'Commitments' },
];

const UNDER_MORE: readonly { id: Destination; label: string }[] = [
  { id: 'learning', label: 'Learning' },
  { id: 'data-privacy', label: 'Data & Privacy' },
];

const GUIDE_ENTRY: Record<GuideKind, string> = {
  morning: 'Morning check-in — sleep, energy, and what today allows.',
  'morning-catch-up': 'Starting late is fine. A shorter check-in, only what still matters.',
  afternoon: 'Afternoon check-in — only what has changed since this morning.',
  evening: 'Evening — close any loops that are open.',
  weekly: 'Sunday — one direction proposed for the week.',
  'quick-check-in': 'A quick update on where things stand.',
};

function useIsOffline(): boolean {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const goOffline = (): void => {
      setOffline(true);
    };
    const goOnline = (): void => {
      setOffline(false);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);
  return offline;
}

export function AppShell(): React.JSX.Element {
  const [destination, setDestination] = useState<Destination>('now');
  const [nowView, setNowView] = useState<NowView>('decision');
  const [mode, setMode] = useState<Mode>({ kind: 'console' });
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const offline = useIsOffline();

  const { status, records, episode, error, writeFailure, now, refresh, reportWriteFailure } =
    useLocalRecords();

  const open = useMemo(() => openEpisodes(records), [records]);
  const suggested = useMemo<GuideKind>(() => {
    const base = suggestedGuide(now);
    return base === 'morning' && isLateMorning(now) ? 'morning-catch-up' : base;
  }, [now]);

  const interfaceState: InterfaceState =
    writeFailure !== undefined
      ? 'recovery'
      : status === 'loading'
        ? 'loading'
        : status === 'error'
          ? 'error'
          : status === 'empty'
            ? 'empty'
            : 'engine';

  const go = (next: Destination): void => {
    setDestination(next);
    setNowView('decision');
    setMode({ kind: 'console' });
    setMoreOpen(false);
  };

  /**
   * Every write follows the same shape: run it, surface a failure honestly, reload the
   * truth from storage. Nothing renders optimistically — the interface shows what
   * committed, not what was attempted.
   */
  const run = async (work: () => Promise<{ ok: boolean; issues?: readonly string[] }>) => {
    setBusy(true);
    try {
      const result = await work();
      if (!result.ok) {
        reportWriteFailure((result.issues ?? []).join('; ') || 'The change was not saved.');
        return;
      }
      reportWriteFailure(undefined);
      await refresh();
      setMode({ kind: 'console' });
      setNowView('decision');
    } catch (caught) {
      reportWriteFailure(
        caught instanceof Error ? caught.message : 'The change did not reach storage.',
      );
    } finally {
      setBusy(false);
    }
  };

  const respond = (label: string): void => {
    if (episode === undefined) return;
    if (label === 'Start') {
      void run(() => startRecommendation(episode, new Date()));
      return;
    }
    if (label === 'Can’t now') {
      setMode({ kind: 'decline' });
      return;
    }
    if (label === 'Update state') {
      setMode({ kind: 'guide', guide: 'quick-check-in', depth: '15' });
      return;
    }
    if (label === 'Why this') {
      setNowView('what-changed');
    }
  };

  const weeklyRespond = (label: string): void => {
    if (episode === undefined) return;
    const week = 7 * 24 * 60 * 60 * 1000;
    const response: WeeklyResponse =
      label === 'Confirm'
        ? { response: 'confirmed' }
        : label === 'Snooze'
          ? { response: 'snoozed', remindAt: new Date(Date.now() + week).toISOString() }
          : label === 'Skip'
            ? { response: 'skipped' }
            : { response: 'adjusted', adjustedStatement: episode.weeklyDirection.proposal };
    void run(() => respondToWeeklyDirection(episode, response, new Date()));
  };

  const finishGuide = (
    guide: GuideKind,
    depth: GuideDepth,
    outcome: GuideOutcome,
    answers: readonly AnsweredPrompt[],
    skippedPromptIds: readonly string[],
  ): void => {
    void run(() =>
      completeGuideSession(
        {
          kind: guide,
          depth,
          outcome,
          answers,
          skippedPromptIds,
          ...(outcome === 'snoozed'
            ? { remindAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() }
            : {}),
        },
        new Date(),
      ),
    );
  };

  const decline = (reason: DeclineReason): void => {
    if (episode === undefined) return;
    void run(() => declineRecommendation(episode, reason, new Date()));
  };

  const submitOutcome = (target: OpenEpisode, answers: readonly AnsweredPrompt[]): void => {
    void run(() =>
      recordOutcome(
        {
          executionRecordId: target.executionRecordId,
          recommendationRecordId: target.recommendationRecordId,
          decisionEpisodeId: target.decisionEpisodeId,
          category: 'career-work-learning',
          target: target.statement,
          openedAt: target.openedAt,
          answers,
        },
        new Date(),
      ),
    );
  };

  const activeLabel =
    [...PRIMARY, ...UNDER_MORE].find((entry) => entry.id === destination)?.label ?? 'Now';

  /* --- Flows that take over the main region -------------------------------- */
  const flow = ((): React.JSX.Element | undefined => {
    if (mode.kind === 'guide') {
      const plan = planGuide(mode.guide, mode.depth, records, now);
      return (
        <GuideSurface
          plan={plan}
          depth={mode.depth}
          onDepthChange={(depth) => {
            setMode({ kind: 'guide', guide: mode.guide, depth });
          }}
          onFinish={(outcome, answers, skippedPromptIds) => {
            finishGuide(mode.guide, mode.depth, outcome, answers, skippedPromptIds);
          }}
          onWeeklyStep={() => {
            setMode({ kind: 'console' });
            setNowView('weekly-direction');
          }}
          onCancel={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    if (mode.kind === 'decline' && episode?.output.kind === 'action') {
      return (
        <DeclineSurface
          statement={episode.output.candidate.statement}
          busy={busy}
          onDecline={decline}
          onCancel={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    if (mode.kind === 'outcome') {
      return (
        <OutcomeSurface
          episode={mode.episode}
          busy={busy}
          onSubmit={(answers) => {
            submitOutcome(mode.episode, answers);
          }}
          onCancel={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    if (mode.kind === 'capture') {
      return (
        <QuickCaptureSurface
          busy={busy}
          onCapture={(input) => {
            void run(() => quickCapture(input, new Date()));
          }}
          onCancel={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    return undefined;
  })();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <div className="shell">
        <nav className="rail" aria-label="Main">
          <p className="rail-brand">LCOS</p>
          {PRIMARY.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className="rail-item"
              onClick={() => {
                go(entry.id);
              }}
              {...(destination === entry.id ? { 'aria-current': 'page' as const } : {})}
            >
              {entry.label}
            </button>
          ))}

          <button
            type="button"
            className="rail-item rail-more"
            aria-expanded={moreOpen}
            onClick={() => {
              setMoreOpen((isOpen) => !isOpen);
            }}
            {...(UNDER_MORE.some((entry) => entry.id === destination)
              ? { 'aria-current': 'page' as const }
              : {})}
          >
            More
          </button>

          {UNDER_MORE.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className="rail-item rail-secondary"
              onClick={() => {
                go(entry.id);
              }}
              {...(destination === entry.id ? { 'aria-current': 'page' as const } : {})}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        {moreOpen ? (
          <div className="more-sheet">
            {UNDER_MORE.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className="more-item"
                onClick={() => {
                  go(entry.id);
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}

        <main className="body" id="main" tabIndex={-1}>
          <header className="head">
            <span className="clock">
              {destination === 'now' && episode !== undefined ? episode.clock : activeLabel}
            </span>
            <h1 className="headline">{destination === 'now' ? 'Now' : activeLabel}</h1>
          </header>

          {flow ??
            (destination === 'now' ? (
              <NowSurface
                episode={episode ?? EMPTY_EPISODE}
                view={nowView}
                interfaceState={episode === undefined ? interfaceState : 'engine'}
                offline={offline}
                busy={busy}
                guideEntry={GUIDE_ENTRY[suggested]}
                openEpisodeCount={open.length}
                errorDetail={writeFailure ?? error}
                onRetry={() => {
                  reportWriteFailure(undefined);
                  void refresh();
                }}
                onRespond={respond}
                onWeeklyRespond={weeklyRespond}
                onOpenGuide={() => {
                  setMode({ kind: 'guide', guide: suggested, depth: DEFAULT_DEPTH });
                }}
                onQuickCapture={() => {
                  setMode({ kind: 'capture' });
                }}
                onRecordOutcome={() => {
                  const target = open[0];
                  if (target !== undefined) setMode({ kind: 'outcome', episode: target });
                }}
                onOpenChanges={() => {
                  setNowView('what-changed');
                }}
                onOpenWeekly={() => {
                  setNowView('weekly-direction');
                }}
                onOpenDirection={() => {
                  go('direction');
                }}
                onBack={() => {
                  setNowView('decision');
                }}
              />
            ) : null)}

          {flow === undefined && destination === 'timeline' ? (
            <TimelineSurface records={records} />
          ) : null}
          {flow === undefined && destination === 'direction' && episode !== undefined ? (
            <DirectionSurface episode={episode} records={records} />
          ) : null}
          {flow === undefined && destination === 'commitments' ? (
            <CommitmentsSurface records={records} />
          ) : null}
          {flow === undefined && destination === 'learning' && episode !== undefined ? (
            <LearningSurface episode={episode} />
          ) : null}
          {flow === undefined && destination === 'data-privacy' ? (
            <DataPrivacySurface records={records} />
          ) : null}
        </main>
      </div>
    </>
  );
}

/**
 * A placeholder for the surfaces that need an episode shape before one exists.
 *
 * Never rendered as content: whenever it is passed, `interfaceState` is loading,
 * empty, error, or recovery, and `NowSurface` returns before touching it. It exists so
 * the empty and error states can be reached without making every field optional.
 */
const EMPTY_EPISODE = {
  episodeId: '',
  at: '',
  clock: '',
  state: {
    readings: [],
    availableMinutes: { status: 'unknown' as const },
    capacity: { status: 'unknown' as const },
    protectedContexts: [],
    contradictions: [],
    unknowns: [],
    staleAttributes: [],
    basisRecordIds: [],
    confidence: { label: 'insufficient-evidence' as const, why: '', dimensions: [] },
  },
} as unknown as Parameters<typeof NowSurface>[0]['episode'];
