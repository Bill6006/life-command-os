import { describe, expect, it } from 'vitest';
import {
  DECLINE_REASONS,
  MAX_DECLINE_REASONS,
  chooseDeclineReasons,
} from '../../src/application/commands/decisionEpisode';

/**
 * Owner clarification 4 and section I: `Can't now` offers a few likely reasons, not a menu.
 *
 * The failure being designed against is an option swamp. Fifteen reasons is a worse question
 * than four: the owner reads the list instead of answering it, and the app then learns
 * whichever reason was easiest to find rather than the one that was true.
 */

const labels = (context: Parameters<typeof chooseDeclineReasons>[0]): string[] =>
  chooseDeclineReasons(context).map((reason) => reason.id);

/* -------------------------------------------------------------------------- */

describe('the list is short, and never claims to be complete', () => {
  it('offers no more than a handful whatever the situation', () => {
    const everything = {
      setting: 'work',
      privacy: 'public',
      interruptibility: 'none',
      neededShape: 'protected-focus',
      lowCapacity: true,
    };
    expect(chooseDeclineReasons(everything).length).toBeLessThanOrEqual(MAX_DECLINE_REASONS);
    expect(chooseDeclineReasons({}).length).toBeLessThanOrEqual(MAX_DECLINE_REASONS);
  });

  it('is always shorter than the catalogue it draws from', () => {
    expect(chooseDeclineReasons({}).length).toBeLessThan(DECLINE_REASONS.length);
  });

  it('always ends with a way out, so the list is never exhaustive', () => {
    for (const context of [{}, { setting: 'work' }, { lowCapacity: true }]) {
      const chosen = chooseDeclineReasons(context);
      expect(chosen[chosen.length - 1]?.id).toBe('unsure');
    }
  });

  it('never repeats a reason, however many rules select it', () => {
    const ids = labels({ setting: 'work', privacy: 'public', neededShape: 'protected-focus' });
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* -------------------------------------------------------------------------- */

describe('the reasons follow the situation', () => {
  it('offers the workplace as an obstacle when the owner is at work', () => {
    expect(labels({ setting: 'work' })).toContain('wrong-place');
    expect(labels({ setting: 'home' })).not.toContain('wrong-place');
  });

  it('offers other people when there is no privacy', () => {
    expect(labels({ privacy: 'public' })).toContain('around-people');
    expect(labels({ privacy: 'private' })).not.toContain('around-people');
  });

  it('reads the shape the refused move needed', () => {
    /* A move that needed privacy makes being overheard the likely obstacle. */
    expect(labels({ neededShape: 'protected-focus' })).toContain('around-people');
    /* A move that needed an unbroken block makes time the likely obstacle. */
    expect(labels({ neededShape: 'exclusive-time' })).toContain('no-time');
  });

  it('does not offer family time to someone sitting at their desk', () => {
    /* The option swamp in miniature: every reason, regardless of plausibility. */
    expect(labels({ setting: 'work', privacy: 'public' })).not.toContain('family-time');
  });

  it('still offers something sensible when nothing at all is known', () => {
    const fallback = labels({});
    expect(fallback).toContain('no-time');
    expect(fallback).toContain('unsure');
    expect(fallback.length).toBeGreaterThan(1);
  });
});

/* -------------------------------------------------------------------------- */

describe('the three kinds of decline stay distinguishable (section I)', () => {
  it('classifies every reason as context, prerequisite, or preference', () => {
    for (const reason of DECLINE_REASONS) {
      expect(['temporary-context', 'prerequisite', 'preference']).toContain(reason.kind);
    }
  });

  it('keeps “not the right action” as the only correction about the move itself', () => {
    const preferences = DECLINE_REASONS.filter((reason) => reason.kind === 'preference');
    expect(preferences.map((reason) => reason.id)).toEqual(['not-relevant']);
  });

  it('treats a reversible gap as a prerequisite with an action, not an inability', () => {
    /*
     * Section I: hunger, water and the like may produce a prerequisite action rather than
     * a permanent no. A reason of this kind that carried no unlocking action would be
     * recording a refusal where there was only a five-minute problem.
     */
    const prerequisites = DECLINE_REASONS.filter((reason) => reason.kind === 'prerequisite');
    expect(prerequisites.length).toBeGreaterThan(0);
    for (const reason of prerequisites) {
      expect(reason.unlockedBy, reason.id).toBeDefined();
      expect(reason.unlockedBy?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('offers a prerequisite route in the default list', () => {
    expect(labels({})).toContain('need-something-first');
  });

  it('blames nobody, in any reason it can offer', () => {
    const wording = DECLINE_REASONS.map((reason) => reason.label.toLowerCase()).join(' ');
    expect(wording).not.toMatch(/lazy|excuse|procrastinat|discipline|failed|should have/);
  });
});
