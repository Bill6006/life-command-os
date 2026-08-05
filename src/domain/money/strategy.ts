import type { CapabilityEffect } from '../capabilities';
import { scaleAttribute } from '../records/scales';

/**
 * Money: the strategic scope, and the machinery deliberately left out (Prompt 8H).
 *
 * ## The whole domain works without a single figure
 *
 * The plan defers "detailed account, transaction, bill, debt, credit, and portfolio
 * machinery unless separately activated". That is not a feature flag over a budgeting
 * app — it is the shape of the domain. **Pressure, resilience, avoidance, what the money
 * is for, and the decisions taken are all bands and words**, and every one of them is
 * useful to somebody who will never tell this application a balance.
 *
 * Resilience is the clearest case. "If money stopped coming in, how long could you cover
 * things?" answered as *a few weeks* carries the fact that matters and no account data at
 * all. A budgeting app would need six months of transactions to compute a worse version
 * of the same answer.
 *
 * Switching the `money-figures` topic on adds exactly one thing: a number against one
 * goal. Everything else is unchanged.
 *
 * ## Money is where a wrong word does the most damage
 *
 * This is the domain most likely to produce shame, and shame is the reason people stop
 * looking — which is the actual problem the avoidance reading exists to catch. So the
 * forbidden list below is longer than any other domain's, and it bars the two registers
 * that cause it: the moralising one (*overspending*, *frivolous*, *bad with money*) and
 * the scoring one (*financial health score*, *net worth*). The word **avoidance** is
 * itself on it: it is the plan's name for the deliverable, not a word this app may use
 * about a person.
 */

/** How long he could cover things. Ordinal, and never a figure. */
export const RESILIENCE_BANDS = [
  'Under a week',
  'A few weeks',
  'A month or two',
  'Several months',
  'Longer than that',
] as const;
export type ResilienceBand = (typeof RESILIENCE_BANDS)[number];

/**
 * When he last looked.
 *
 * The last option is his to choose and the app never infers it. "I have been putting it
 * off" said plainly by the owner is a fact; the same thing concluded by software is a
 * diagnosis it has no standing to make.
 */
export const LAST_LOOKED = [
  'Today or yesterday',
  'This week',
  'A few weeks ago',
  'Longer than that',
  'I have been putting it off',
] as const;

/** Not looking, in his words. The only two answers that make the app offer anything. */
export const NOT_LOOKED_RECENTLY: readonly string[] = [
  'Longer than that',
  'I have been putting it off',
];

/** What became of a decision. "Decided against it" is a decision, not a failure. */
export const DECISION_OUTCOMES = ['Did it', 'Decided against it', 'Still deciding'] as const;

/** Whether the pressure moved after a decision. Never attributed to the decision. */
export const PRESSURE_SINCE = ['Less', 'About the same', 'More'] as const;

/* -------------------------------------------------------------------------- */

export const MONEY_ACTION_IDS = [
  'make-the-call',
  'look-at-one-number',
  'name-what-it-is-for',
  'one-thing-that-moves-it',
] as const;
export type MoneyActionId = (typeof MONEY_ACTION_IDS)[number];

export interface MoneyAction {
  readonly id: MoneyActionId;
  readonly statement: string;
  readonly intendedOutcome: string;
  readonly minimumVersion: string;
  readonly stoppingPoint: string;
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly followUpPromptId: string;
  readonly capabilityEffects: readonly CapabilityEffect[];
}

const RESILIENCE: CapabilityEffect = {
  channel: 'financial-freedom-and-resilience',
  effect: 'improves',
  magnitude: 'meaningful',
  basis: 'app-inference',
  crossDomain: false,
};

const STEADINESS: CapabilityEffect = {
  channel: 'emotional-regulation',
  effect: 'improves',
  magnitude: 'small',
  basis: 'app-inference',
  crossDomain: true,
};

/**
 * Four actions, and none of them tells anyone what to do with their money.
 *
 * Three are about a decision he already named or a goal he already set. The fourth —
 * looking at one number for two minutes — is the only one the app raises on its own, and
 * it is deliberately the smallest possible act. Somebody who has not opened their banking
 * app for a month does not need a plan; they need the first two minutes, and an
 * application that responds to avoidance with a budgeting exercise guarantees another
 * month.
 *
 * There is no action for saving, spending, investing, consolidating, or switching
 * anything. Those are financial advice, and this product is not licensed to give it.
 */
export const MONEY_ACTIONS: Record<MoneyActionId, MoneyAction> = {
  'make-the-call': {
    id: 'make-the-call',
    statement: 'Make the call you were weighing',
    intendedOutcome: 'It is decided, either way',
    minimumVersion: 'Decide it. Deciding against it is deciding it',
    stoppingPoint: 'One decision. Nothing else needs looking at today',
    durationMinutes: 20,
    minimumMinutes: 5,
    followUpPromptId: 'money:decision-made',
    capabilityEffects: [RESILIENCE, STEADINESS],
  },
  'look-at-one-number': {
    /*
     * The smallest possible re-entry, and the only action raised without him naming
     * something first. Two minutes and one number, because the alternative to a small
     * ask here is not a big one — it is another month of not looking.
     */
    id: 'look-at-one-number',
    statement: 'Look at one number for two minutes',
    intendedOutcome: 'You looked. That is the whole of it',
    minimumVersion: 'Open it. Read one figure. Close it',
    stoppingPoint: 'Two minutes. Nothing has to be decided or fixed today',
    durationMinutes: 5,
    minimumMinutes: 2,
    followUpPromptId: 'update-area:money',
    capabilityEffects: [STEADINESS],
  },
  'name-what-it-is-for': {
    id: 'name-what-it-is-for',
    statement: 'Write down what the money is actually for',
    intendedOutcome: 'There is one sentence on record, in your words',
    minimumVersion: 'One line. It can be wrong and changed later',
    stoppingPoint: 'One thing. A plan can wait',
    durationMinutes: 10,
    minimumMinutes: 2,
    followUpPromptId: 'outcome:completed',
    capabilityEffects: [RESILIENCE],
  },
  'one-thing-that-moves-it': {
    id: 'one-thing-that-moves-it',
    statement: 'Do the one thing that moves what you named',
    intendedOutcome: 'The thing you said it was for is closer than it was',
    minimumVersion: 'The first step of it',
    stoppingPoint: 'One step. This is not an afternoon of admin',
    durationMinutes: 30,
    minimumMinutes: 10,
    followUpPromptId: 'money:pressure-since',
    capabilityEffects: [RESILIENCE, STEADINESS],
  },
};

export const MONEY_ATTRIBUTES = {
  /** The shared scale attribute. One reading, one canonical home. */
  pressure: scaleAttribute('financial-pressure'),
  resilience: 'money:resilience',
  lastLooked: 'money:last-looked',
  decisionNamed: 'money:decision-named',
  decisionMade: 'money:decision-made',
  pressureSince: 'money:pressure-since',
  goalTarget: 'money:goal-target',
  goalCurrent: 'money:goal-current',
  event: 'money:event',
} as const;

/**
 * Words this domain may never use.
 *
 * The first group moralises. The second scores. The third is the budgeting app, which is
 * a different product built on transaction data this one deliberately does not hold.
 */
export const FORBIDDEN_MONEY_VOCABULARY = [
  // Moralising.
  'overspending',
  'bad with money',
  'financial discipline',
  'you cannot afford',
  'frivolous',
  'wasted',
  'should have saved',
  'living beyond',
  'irresponsible',
  'avoidance',
  'in denial',
  // Scoring.
  'financial health score',
  'money score',
  'credit score',
  'net worth',
  'financial fitness',
  // The budgeting app.
  'budget',
  'spending category',
  'categorise your',
  'subscription audit',
  'envelope method',
] as const;
