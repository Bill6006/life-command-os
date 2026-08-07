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
import { isLockEnabled, unlock } from '../../../application/commands/appLock';
import {
  setCoverageCadence,
  snoozeArea,
  setDomainState,
} from '../../../application/commands/domainPreference';
import {
  recordSkillEvidence,
  respondToProgression,
  setAgeBand,
  setSkillLevel,
} from '../../../application/commands/fatherhood';
import { buildLearningMap } from '../../../intelligence/domains/fatherhood/learningMap';
import { LearningMapView } from '../direction/LearningMapView';
import { EmotionalAreaView } from '../direction/EmotionalAreaView';
import { FaithAreaView } from '../direction/FaithAreaView';
import { HomeAreaView } from '../direction/HomeAreaView';
import { FAITH_TOPICS } from '../direction/TopicPermissions';
import { ReviewSurface } from '../review/ReviewSurface';
import { MoneyAreaView } from '../direction/MoneyAreaView';
import {
  nameFaithAnchor,
  recordFaithObservation,
  recordFaithStruggle,
  recordPracticeOccasion,
  retireFaithAnchor,
} from '../../../application/commands/faith';
import {
  nameEnvironmentChange,
  recordFriction,
  recordHomeState,
} from '../../../application/commands/home';
import {
  nameMoneyDecision,
  nameMoneyPurpose,
  recordFinancialPressure,
  recordGoalFigure,
  recordMoneyState,
} from '../../../application/commands/money';
import { assessFaith } from '../../../intelligence/domains/faith';
import { assessHome } from '../../../intelligence/domains/home';
import { assessMoney } from '../../../intelligence/domains/money';
import {
  recordBoundary,
  recordEmotionalObservation,
  recordPrivateNote,
  setSurfacePermission,
  setTopicEnabled,
} from '../../../application/commands/emotional';
import { assessEmotional } from '../../../intelligence/domains/emotional';
import { enabledTopics, grantedSurfaces } from '../../../domain/emotional/permissions';
import { PROTECTED_TOPICS } from '../../../domain/records/permissions';
import { quickCaptureOptions } from '../../../domain/capture/registry';
import type { DomainId } from '../../../domain/domains/definitions';
import { onDatabaseSuperseded } from '../../../application/queries/storageInfo';
import { LockScreen } from '../data-privacy/LockScreen';
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
  'now' | 'timeline' | 'direction' | 'commitments' | 'review' | 'learning' | 'data-privacy';

/** What the owner is doing right now. Only one flow is ever open. */
type Mode =
  | { readonly kind: 'console' }
  | {
      readonly kind: 'guide';
      readonly guide: GuideKind;
      readonly depth: GuideDepth;
      /** Set only for update-area, which asks one domain's own questions. */
      readonly domainId?: DomainId | undefined;
    }
  | { readonly kind: 'decline' }
  | { readonly kind: 'outcome'; readonly episode: OpenEpisode }
  | { readonly kind: 'capture' }
  /**
   * The fatherhood learning map: a scan page, not a guide.
   *
   * `Update This Area` opens this for a domain that has several independently editable
   * items. The guided one-question-at-a-time flow is still reachable from it, for when
   * the owner would rather be led than scan.
   */
  | { readonly kind: 'learning-map' }
  /** The emotional area page: a scan surface with a protected section inside it. */
  | { readonly kind: 'emotional-area' }
  /** The faith area page: his words, and what he recorded against them. */
  | { readonly kind: 'faith-area' }
  /** The home area page: what got in the way, and the one change. */
  | { readonly kind: 'home-area' }
  /** The money area page: pressure, cover, and the one decision. */
  | { readonly kind: 'money-area' }
  /**
   * The exact question Command Core displayed, opened from `Answer it` (`V33-049`).
   *
   * A distinct mode rather than a flag on `guide`, so it is impossible to reach this
   * routing by accident from anywhere that opens an ordinary check-in.
   */
  | { readonly kind: 'answer-question'; readonly promptId: string };

const PRIMARY: readonly { id: Destination; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'direction', label: 'Direction' },
  { id: 'commitments', label: 'Commitments' },
];

const UNDER_MORE: readonly { id: Destination; label: string }[] = [
  /*
   * Review is the Weekly Quick Domain Scan and the deep review (Phase 8). It lives under
   * More rather than in the persistent bar because it is a surface the owner goes to
   * deliberately — putting it beside Now would make a weekly rhythm look like a daily one.
   */
  { id: 'review', label: 'Review' },
  { id: 'learning', label: 'Learning' },
  { id: 'data-privacy', label: 'Data & Privacy' },
];

/**
 * The check-in entry, as a title and one supporting line (`V33-011`).
 *
 * This was a single sentence rendered at 12px inside a bar tall enough for four, so the
 * whole card read as a caption floating in an empty panel — and the three time blocks came
 * out 94, 116 and 135 pixels tall purely because their sentences wrapped differently.
 *
 * Splitting it lets one component give every block the same shape: a title at reading size,
 * a support line, an action. The blocks still differ in what they say. They no longer
 * differ in how large they are for no reason.
 */
export interface GuideEntry {
  readonly title: string;
  readonly detail: string;
}

const GUIDE_ENTRY: Record<GuideKind, GuideEntry> = {
  morning: {
    title: 'Morning check-in',
    detail: 'Sleep, energy, and what today allows.',
  },
  'morning-catch-up': {
    title: 'Catching up',
    detail: 'Starting late is fine. Only what still matters.',
  },
  afternoon: {
    title: 'Afternoon check-in',
    detail: 'Only what has changed since this morning.',
  },
  evening: {
    title: 'Evening check-in',
    detail: 'Close any loops that are still open.',
  },
  weekly: {
    title: 'This week’s direction',
    detail: 'One direction proposed for the week ahead.',
  },
  'quick-check-in': {
    title: 'Quick update',
    detail: 'Where things stand right now.',
  },
  'update-area': {
    title: 'Update one area',
    detail: 'Just the questions that area asks.',
  },
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
  const [locked, setLocked] = useState<boolean | undefined>(undefined);
  const [staleTab, setStaleTab] = useState(false);
  const offline = useIsOffline();

  // The lock is checked before anything is rendered, so records never flash on screen
  // ahead of it. `undefined` means "not yet known", which renders as loading.
  useEffect(() => {
    void isLockEnabled().then(setLocked);
  }, []);

  useEffect(
    () =>
      onDatabaseSuperseded(() => {
        setStaleTab(true);
      }),
    [],
  );

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
      : status === 'loading' || locked === undefined
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
   *
   * `stay` keeps the current surface open afterwards. A guide is finished by answering
   * it, so it closes; a scan page is a place the owner is *working*, and closing it
   * after every edit would make updating three things a matter of opening it three
   * times — which is exactly the friction the scan page exists to remove.
   */
  const run = async (
    work: () => Promise<{ ok: boolean; issues?: readonly string[] }>,
    options: { readonly stay?: boolean } = {},
  ) => {
    setBusy(true);
    try {
      const result = await work();
      if (!result.ok) {
        reportWriteFailure((result.issues ?? []).join('; ') || 'The change was not saved.');
        return;
      }
      reportWriteFailure(undefined);
      await refresh();
      if (options.stay === true) return;
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
    if (records.length === 0) return;
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
    if (records.length === 0) return;
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
    if (records.length === 0) return;
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
      /*
       * Command Core decides coverage; the planner arranges it. Passing the decision in is
       * what makes cooldown, expiry, repeated-skip, cadence, and snooze change what the
       * owner is actually asked rather than only what a panel reports.
       */
      const plan = planGuide(mode.guide, mode.depth, records, now, mode.domainId, {
        suppressed: new Map(
          episode.commandCore.coverage.suppressed.map((item) => [item.promptId, item.detail]),
        ),
        offered: episode.commandCore.coverage.offered.map((item) => ({
          promptId: item.promptId,
          surface: item.surface,
        })),
      });
      return (
        <GuideSurface
          plan={plan}
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

    if (mode.kind === 'decline' && episode.output.kind === 'action') {
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

    if (mode.kind === 'learning-map') {
      return (
        <LearningMapView
          map={buildLearningMap(records, now)}
          busy={busy}
          onSetLevel={(skillId, level, note) => {
            void run(() => setSkillLevel({ skillId, level, note }, new Date()), { stay: true });
          }}
          onRecordEvidence={(skillId, level) => {
            void run(() => recordSkillEvidence({ skillId, level }, new Date()), { stay: true });
          }}
          onSetAgeBand={(band) => {
            void run(() => setAgeBand(band, new Date()), { stay: true });
          }}
          onProgressionResponse={(skill, response) => {
            if (response !== 'approve') return;
            if (skill.progression.kind !== 'suggested') return;
            const { to, supporting } = skill.progression;
            void run(
              async () => {
                const result = await respondToProgression(
                  {
                    skillId: skill.skillId,
                    response,
                    to,
                    supportingRecordIds: supporting.map((item) => item.recordId),
                  },
                  new Date(),
                );
                return result ?? { ok: true };
              },
              { stay: true },
            );
          }}
          onOpenGuided={() => {
            setMode({
              kind: 'guide',
              guide: 'update-area',
              depth: 'full',
              domainId: 'fatherhood',
            });
          }}
          onClose={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    if (mode.kind === 'emotional-area') {
      const evidence = assessEmotional(records, now);
      return (
        <EmotionalAreaView
          state={{
            enabledTopics: evidence.enabledTopics,
            grants: new Map(
              PROTECTED_TOPICS.map((topic) => [topic, grantedSurfaces(records, topic)]),
            ),
            conflictOpen: evidence.conflictOpen,
            openBoundary: evidence.openBoundary,
          }}
          busy={busy}
          onRecord={(attribute, choice) => {
            void run(
              () => recordEmotionalObservation({ attribute, state: choice }, new Date()),
              { stay: true },
            );
          }}
          onRecordBoundary={(text) => {
            void run(() => recordBoundary(text, new Date()), { stay: true });
          }}
          onPrivateNote={(text) => {
            void run(() => recordPrivateNote(text, new Date()), { stay: true });
          }}
          onSetTopicEnabled={(topic, enabled) => {
            void run(() => setTopicEnabled(topic, enabled, new Date()), { stay: true });
          }}
          onSetPermission={(topic, surface, granted) => {
            void run(() => setSurfacePermission({ topic, surface, granted }, new Date()), {
              stay: true,
            });
          }}
          onOpenGuided={() => {
            setMode({
              kind: 'guide',
              guide: 'update-area',
              depth: 'full',
              domainId: 'emotional-and-relationships',
            });
          }}
          onClose={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    if (mode.kind === 'faith-area') {
      const evidence = assessFaith(records, now);
      return (
        <FaithAreaView
          state={{
            grants: new Map(
              FAITH_TOPICS.map((topic) => [topic, grantedSurfaces(records, topic)]),
            ),
            values: evidence.values.map((value) => ({
              recordId: value.recordId,
              statement: value.statement,
            })),
            purpose: evidence.purpose?.statement,
            practices: evidence.practices,
            openRepair: evidence.openRepair,
            repairDone: evidence.repairDone,
            struggleCount: evidence.struggleCount,
          }}
          busy={busy}
          onName={(kind, statement) => {
            void run(() => nameFaithAnchor({ kind, statement }, new Date()), { stay: true });
          }}
          onRetire={(practice) => {
            void run(
              () =>
                retireFaithAnchor(
                  { kind: 'practice', statement: practice.statement },
                  new Date(),
                ),
              { stay: true },
            );
          }}
          onRecordOccasion={(practice, outcome) => {
            void run(
              () =>
                recordPracticeOccasion(
                  { practiceRecordId: practice.recordId, outcome },
                  new Date(),
                ),
              { stay: true },
            );
          }}
          onRecord={(attribute, state, text) => {
            void run(() => recordFaithObservation({ attribute, state, text }, new Date()), {
              stay: true,
            });
          }}
          onStruggle={(text) => {
            void run(() => recordFaithStruggle(text, new Date()), { stay: true });
          }}
          onSetPermission={(topic, surface, granted) => {
            void run(() => setSurfacePermission({ topic, surface, granted }, new Date()), {
              stay: true,
            });
          }}
          onOpenGuided={() => {
            setMode({
              kind: 'guide',
              guide: 'update-area',
              depth: 'full',
              domainId: 'faith-and-meaning',
            });
          }}
          onClose={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    if (mode.kind === 'home-area') {
      const evidence = assessHome(records, now);
      return (
        <HomeAreaView
          state={{
            frictions: evidence.frictions,
            repeated: evidence.repeated,
            openChange: evidence.openChange,
            changeStatement: evidence.changeStatement,
            changeMade: evidence.changeMade,
            frictionSince: evidence.frictionSince,
            conditions: evidence.conditions,
            access: evidence.access,
            setupTime: evidence.setupTime,
            transition: evidence.transition,
          }}
          busy={busy}
          onRecordFriction={(kindLabel, purpose) => {
            void run(() => recordFriction({ kindLabel, purpose }, new Date()), { stay: true });
          }}
          onRecord={(attribute, value) => {
            void run(() => recordHomeState({ attribute, state: value }, new Date()), {
              stay: true,
            });
          }}
          onNameChange={(statement) => {
            void run(
              () =>
                nameEnvironmentChange(
                  { statement, openChange: evidence.openChange },
                  new Date(),
                ),
              { stay: true },
            );
          }}
          onOpenGuided={() => {
            setMode({
              kind: 'guide',
              guide: 'update-area',
              depth: 'full',
              domainId: 'home-and-environment',
            });
          }}
          onClose={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    if (mode.kind === 'money-area') {
      const evidence = assessMoney(records, now);
      return (
        <MoneyAreaView
          state={{
            pressureLabel: evidence.pressure?.label,
            resilience: evidence.resilience,
            lastLooked: evidence.lastLooked,
            openDecision: evidence.openDecision,
            decisionStatement: evidence.decisionStatement,
            decisionMade: evidence.decisionMade,
            pressureSince: evidence.pressureSince,
            purpose: evidence.purpose?.statement,
            figuresEnabled: evidence.figuresEnabled,
            goalTarget: evidence.goalTarget,
            goalCurrent: evidence.goalCurrent,
          }}
          busy={busy}
          onPressure={(ordinal) => {
            void run(() => recordFinancialPressure(ordinal, new Date()), { stay: true });
          }}
          onRecord={(attribute, value) => {
            void run(() => recordMoneyState({ attribute, state: value }, new Date()), {
              stay: true,
            });
          }}
          onNameDecision={(statement) => {
            void run(() => nameMoneyDecision(statement, new Date()), { stay: true });
          }}
          onNamePurpose={(statement) => {
            void run(() => nameMoneyPurpose(statement, new Date()), { stay: true });
          }}
          onFigure={(which, amount, unit) => {
            void run(
              () =>
                recordGoalFigure(
                  { which, amount, unit, figuresEnabled: evidence.figuresEnabled },
                  new Date(),
                ),
              { stay: true },
            );
          }}
          onSetFiguresEnabled={(enabled) => {
            void run(
              () =>
                setTopicEnabled('money-figures', enabled, new Date(), {
                  category: 'money',
                  privacy: 'money',
                }),
              { stay: true },
            );
          }}
          onOpenGuided={() => {
            setMode({
              kind: 'guide',
              guide: 'update-area',
              depth: 'full',
              domainId: 'money',
            });
          }}
          onClose={() => {
            setMode({ kind: 'console' });
          }}
        />
      );
    }

    if (mode.kind === 'answer-question') {
      /*
       * The exact question Now displayed, asked first (`V33-049`).
       *
       * A quick check-in rather than the suggested guide for the hour: the owner tapped
       * `Answer it` on one question, not "take me through the morning". Depth `15` keeps
       * the flow to the shortest useful shape, and `leadPromptId` guarantees the first step
       * is the question they were looking at.
       *
       * The coverage decision still applies to anything *after* it — so a follow-up appears
       * only when it can still change the decision (`V33-050`), and never as a generic
       * interrogation chain.
       */
      const plan = planGuide(
        'quick-check-in',
        '15',
        records,
        now,
        undefined,
        {
          suppressed: new Map(
            episode.commandCore.coverage.suppressed.map((item) => [item.promptId, item.detail]),
          ),
          offered: episode.commandCore.coverage.offered.map((item) => ({
            promptId: item.promptId,
            surface: item.surface,
          })),
        },
        mode.promptId,
      );

      return (
        <GuideSurface
          plan={plan}
          onFinish={(outcome, answers, skippedPromptIds) => {
            finishGuide('quick-check-in', '15', outcome, answers, skippedPromptIds);
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

    if (mode.kind === 'capture') {
      return (
        <QuickCaptureSurface
          busy={busy}
          domainOptions={quickCaptureOptions(
            episode.domains
              .filter((panel) => panel.state === 'enabled')
              .map((panel) => panel.domainId),
            enabledTopics(records),
          )}
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

  if (locked === true) {
    return (
      <div className="shell">
        <main className="body" id="main" tabIndex={-1}>
          <LockScreen
            onUnlock={async (passphrase) => {
              const ok = await unlock(passphrase);
              if (ok) setLocked(false);
              return ok;
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      {staleTab ? (
        <p className="banner" role="alert">
          <span className="banner-label">Another tab</span>
          <span>
            This app was updated in another tab, so this one stopped saving to avoid writing
            through an old schema. Nothing here was lost. Reload to continue.
          </span>
        </p>
      ) : null}

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
              {destination === 'now' && records.length > 0 ? episode.clock : activeLabel}
            </span>
            <h1 className="headline">{destination === 'now' ? 'Now' : activeLabel}</h1>
          </header>

          {flow ??
            (destination === 'now' ? (
              <NowSurface
                episode={episode}
                view={nowView}
                interfaceState={records.length === 0 ? interfaceState : 'engine'}
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
                onOpenGuide={(promptId) => {
                  /*
                   * `Answer it` asks the question that was on screen. Everything else that
                   * opens a guide from Now still gets the check-in for the hour.
                   */
                  setMode(
                    promptId === undefined
                      ? { kind: 'guide', guide: suggested, depth: DEFAULT_DEPTH }
                      : { kind: 'answer-question', promptId },
                  );
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
          {flow === undefined && destination === 'direction' ? (
            <DirectionSurface
              episode={episode}
              records={records}
              busy={busy}
              onUpdateArea={(domainId) => {
                setMode(
                  domainId === 'fatherhood'
                    ? { kind: 'learning-map' }
                    : domainId === 'emotional-and-relationships'
                      ? { kind: 'emotional-area' }
                      : domainId === 'faith-and-meaning'
                        ? { kind: 'faith-area' }
                        : domainId === 'home-and-environment'
                          ? { kind: 'home-area' }
                          : domainId === 'money'
                            ? { kind: 'money-area' }
                            : { kind: 'guide', guide: 'update-area', depth: 'full', domainId },
                );
              }}
              onSetAreaState={(domainId, state) => {
                void run(() => setDomainState(records, { domainId, state }, new Date()));
              }}
              onSetCadence={(domainId, cadence) => {
                void run(() => setCoverageCadence({ domainId, cadence }, new Date()));
              }}
              onSnooze={(domainId, untilIso) => {
                void run(() => snoozeArea({ domainId, untilIso }, new Date()));
              }}
            />
          ) : null}
          {flow === undefined && destination === 'review' ? (
            <ReviewSurface
              episode={episode}
              busy={busy}
              onQuickUpdate={(domainId) => {
                /*
                 * The middle response: the area's own questions at the shortest depth, so
                 * a quick update is genuinely quick and still writes through the one
                 * canonical path rather than a scan-specific shortcut.
                 */
                go('direction');
                setMode({ kind: 'guide', guide: 'update-area', depth: '15', domainId });
              }}
              onNoChange={() => {
                /*
                 * "I looked and nothing had moved" is the fact `GuideSessionRecord` was
                 * created for — it cannot be reconstructed from the observations, because
                 * there are none. Recorded as a review session with nothing answered.
                 */
                void run(() =>
                  completeGuideSession(
                    {
                      kind: 'weekly',
                      depth: '15',
                      outcome: 'completed',
                      answers: [],
                      skippedPromptIds: [],
                    },
                    new Date(),
                  ),
                );
              }}
              onOpenArea={(domainId) => {
                go('direction');
                setMode(
                  domainId === 'fatherhood'
                    ? { kind: 'learning-map' }
                    : domainId === 'emotional-and-relationships'
                      ? { kind: 'emotional-area' }
                      : domainId === 'faith-and-meaning'
                        ? { kind: 'faith-area' }
                        : domainId === 'home-and-environment'
                          ? { kind: 'home-area' }
                          : domainId === 'money'
                            ? { kind: 'money-area' }
                            : { kind: 'guide', guide: 'update-area', depth: 'full', domainId },
                );
              }}
            />
          ) : null}
          {flow === undefined && destination === 'commitments' ? (
            <CommitmentsSurface records={records} />
          ) : null}
          {flow === undefined && destination === 'learning' && records.length > 0 ? (
            <LearningSurface episode={episode} />
          ) : null}
          {flow === undefined && destination === 'data-privacy' ? (
            <DataPrivacySurface recordCount={records.length} episode={episode} />
          ) : null}
        </main>
      </div>
    </>
  );
}
