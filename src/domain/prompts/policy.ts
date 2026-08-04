/**
 * The behaviour-first question policy (`OBS-001`, `OBS-002`, `OBS-003`, `OBS-012`).
 *
 * The rule this file exists to enforce, in the owner's words:
 *
 *   > The owner reports what can be observed. The app looks for patterns.
 *   > Neither side pretends to know the cause.
 *
 * A normal prompt may ask what happened. It may not ask why it happened, what caused
 * it, whether something "worked", or how anything felt. Those questions demand
 * psychological self-explanation the owner has no reliable access to, and answers to
 * them are guesses that the learning layer would then treat as evidence.
 *
 * **Why this is a validation boundary and not a style guide.** A prohibited question
 * is easy to add by accident and almost impossible to spot in review once the app has
 * a hundred prompts. So every prompt in the product is a `PromptDefinition`, every
 * definition is checked here, and the catalogue validates itself at module load — an
 * offending prompt breaks the build rather than reaching a person.
 *
 * **What this does not police.** System-authored explanation is unaffected: "Why
 * this" reason traces, `whyItMatters` copy, and inference labelled as inference are
 * the app explaining itself, which is required elsewhere (`OBS-007`). The boundary
 * applies to questions put *to the owner* in normal flows.
 */

export type PromptViolationCode =
  | 'requires-cause'
  | 'requires-feeling'
  | 'requires-efficacy-judgement'
  | 'requires-self-diagnosis'
  | 'missing-unknown-option'
  | 'not-a-question';

export interface PromptViolation {
  readonly code: PromptViolationCode;
  readonly detail: string;
}

/**
 * A question the owner is asked in a normal flow.
 *
 * `allowsUnknown` is required rather than defaulted, because "Unknown is always
 * valid" (`OWN-024`, `OBS-006`) is a decision each prompt has to make explicitly.
 * A prompt that genuinely cannot be unknown — "did you press start?" — says so.
 */
export interface PromptDefinition {
  readonly promptId: string;
  readonly text: string;
  /**
   * `state` — anchored present-state report.
   * `observable` — something that either happened or did not.
   * `preference` — an owner choice about how the app behaves.
   * `optional-note` — free text the owner initiates. Never required.
   */
  readonly kind: 'state' | 'observable' | 'preference' | 'optional-note';
  readonly answers: readonly string[];
  readonly allowsUnknown: boolean;
  /** Why the answer is worth asking for. Must be able to change something. */
  readonly whatItCouldChange: readonly string[];
}

/**
 * Prohibited patterns.
 *
 * Written against the *question text*, in the forms these actually appear in
 * products. Each carries the code it violates so a failure names the rule rather
 * than a regular expression.
 *
 * The word "why" is caught only when it addresses the owner — `why did you`, `why do
 * you`, `why was`, and bare `why …?` openers. That keeps "Why this" — the app
 * explaining its own reasoning — usable as a control label, which it must remain.
 */
const PROHIBITED: readonly {
  readonly pattern: RegExp;
  readonly code: PromptViolationCode;
  readonly detail: string;
}[] = [
  {
    pattern: /\bwhy (did|do|are|were|was|is|does|would|have|has|can'?t|cannot) you\b/i,
    code: 'requires-cause',
    detail: 'Asks the owner to explain their own behaviour or state',
  },
  {
    pattern: /^\s*why\b/i,
    code: 'requires-cause',
    detail: 'Opens with "why", which demands a causal explanation',
  },
  {
    pattern: /\bwhat (caused|causes|made|makes|led to|triggered|triggers)\b/i,
    code: 'requires-cause',
    detail: 'Asks the owner to identify a cause',
  },
  {
    pattern: /\b(reason|explanation) (for|behind|why)\b/i,
    code: 'requires-cause',
    detail: 'Asks the owner for the reason behind something',
  },
  {
    pattern: /\bdo you think .*(caused|because|why|helped|worked)\b/i,
    code: 'requires-cause',
    detail: 'Asks the owner to hypothesise about cause or effect',
  },
  {
    pattern: /\bhow (did|does|do) (this|that|it|they) make you feel\b/i,
    code: 'requires-feeling',
    detail: 'Asks how something made the owner feel',
  },
  {
    pattern: /\bhow (did|do) you feel\b/i,
    code: 'requires-feeling',
    detail: 'Asks the owner to report a feeling about an event rather than a present state',
  },
  {
    pattern: /\bhow are you feeling about\b/i,
    code: 'requires-feeling',
    detail: 'Asks for a feeling about a subject rather than an anchored present state',
  },
  {
    pattern: /\bdid (this|that|it) (work|help)\b/i,
    code: 'requires-efficacy-judgement',
    detail: 'Asks the owner to judge whether something worked — that is an evaluation',
  },
  {
    pattern: /\b(was|were) (this|that|it) (helpful|effective|useful|worth it)\b/i,
    code: 'requires-efficacy-judgement',
    detail: 'Asks the owner to judge effectiveness',
  },
  {
    pattern: /\brate (how|the) .*(effective|helpful|useful)\b/i,
    code: 'requires-efficacy-judgement',
    detail: 'Asks the owner to score effectiveness',
  },
  {
    pattern: /\bwhat (strategy|approach|technique) .*(would|will|should) (help|work)\b/i,
    code: 'requires-self-diagnosis',
    detail: 'Asks the owner to prescribe their own intervention',
  },
  {
    pattern: /\bwhat('s| is) (wrong|holding you back|stopping you)\b/i,
    code: 'requires-self-diagnosis',
    detail: 'Asks the owner to diagnose themselves',
  },
  {
    pattern: /\bare you (avoiding|procrastinating|self.?sabotag)/i,
    code: 'requires-self-diagnosis',
    detail: 'Asks the owner to accept a psychological label',
  },
];

/**
 * Checks one prompt definition against the policy.
 *
 * Optional notes are exempt from the question checks and only from those: the owner
 * volunteering "I think it was the late night" is owner interpretation, which is
 * explicitly permitted and stored as interpretation rather than cause (`OBS-011`).
 * The app may never *require* it, which is why `optional-note` prompts are rejected
 * if they do not allow Unknown.
 */
export function validatePromptDefinition(
  definition: PromptDefinition,
): readonly PromptViolation[] {
  const violations: PromptViolation[] = [];

  if (definition.kind !== 'optional-note') {
    for (const rule of PROHIBITED) {
      if (rule.pattern.test(definition.text)) {
        violations.push({ code: rule.code, detail: `"${definition.text}" — ${rule.detail}` });
      }
    }
  }

  if (definition.kind === 'optional-note' && !definition.allowsUnknown) {
    violations.push({
      code: 'missing-unknown-option',
      detail: `"${definition.promptId}" is an optional note but cannot be left unanswered`,
    });
  }

  if (definition.kind === 'state' && !definition.allowsUnknown) {
    violations.push({
      code: 'missing-unknown-option',
      detail: `"${definition.promptId}" reports state but offers no Unknown`,
    });
  }

  if (definition.whatItCouldChange.length === 0) {
    violations.push({
      code: 'not-a-question',
      detail: `"${definition.promptId}" cannot change anything, so it should not be asked`,
    });
  }

  return violations;
}

/** Checks a whole catalogue. Returns every violation, not just the first. */
export function validatePromptCatalogue(
  definitions: readonly PromptDefinition[],
): readonly PromptViolation[] {
  return definitions.flatMap(validatePromptDefinition);
}

/**
 * Validates at module load and throws on failure.
 *
 * A prohibited question is a defect that must never reach a person, so the failure
 * mode is a hard one: the module that defines the catalogue cannot finish importing,
 * which fails the build, the tests, and the page load alike.
 */
export function assertPromptCatalogue(definitions: readonly PromptDefinition[]): void {
  const violations = validatePromptCatalogue(definitions);
  if (violations.length > 0) {
    const detail = violations.map((v) => `[${v.code}] ${v.detail}`).join('\n  ');
    throw new Error(`Prompt definitions violate the behaviour-first policy:\n  ${detail}`);
  }
}
