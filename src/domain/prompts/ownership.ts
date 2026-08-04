import { DOMAIN_LIST } from '../domains/definitions';
import { ALL_PROMPTS, type CapturePrompt } from './definitions';

/**
 * Prompt ownership (Prompt 8A task 6, `XDS-014`).
 *
 * Exactly one surface owns each question. Not "usually one" — one, checked.
 *
 * ## The failure this prevents
 *
 * Seven domains, five guides, and a weekly review all have a legitimate interest in
 * "how is your energy". Without an ownership rule, each adds it, and the owner is
 * asked the same thing four times in a morning by four features that each believe
 * they asked once. That is how the legacy app became a wall of checkboxes: not by
 * anyone deciding to build one, but by nobody owning the question.
 *
 * ## The five owners
 *
 * | Owner | Asks about |
 * |---|---|
 * | `guide` | Present state and available capacity |
 * | `update-this-area` | One domain's own state, on demand |
 * | `decision-episode` | What happened after a specific action |
 * | `review` | Strategic conflicts, weekly and seasonal |
 * | `data-privacy` | Storage, backup, export, and consent |
 *
 * A prompt claimed by two owners is a build failure, not a review comment.
 */

export const PROMPT_OWNERS = [
  'guide',
  'update-this-area',
  'decision-episode',
  'review',
  'data-privacy',
] as const;
export type PromptOwner = (typeof PROMPT_OWNERS)[number];

export const OWNER_LABELS: Record<PromptOwner, string> = {
  guide: 'Guide or Quick Check-In',
  'update-this-area': 'Update This Area',
  'decision-episode': 'The decision episode it follows up',
  review: 'Weekly or strategic review',
  'data-privacy': 'Data & Privacy',
};

/**
 * Which owner a prompt belongs to, from its id.
 *
 * Derived from the prompt's own identifier rather than kept in a separate table,
 * because two lists that must agree eventually disagree. A new prompt gets an owner by
 * being named consistently, and a prompt that matches no rule is reported rather than
 * defaulted — defaulting is how a question ends up owned by whoever asks first.
 */
export function ownerOf(prompt: CapturePrompt): PromptOwner | undefined {
  const id = prompt.promptId;
  if (id.startsWith('outcome:')) return 'decision-episode';
  if (id.startsWith('update-area:')) return 'update-this-area';
  if (id.startsWith('review:')) return 'review';
  if (id.startsWith('privacy:')) return 'data-privacy';

  /*
   * A domain's own questions belong to Update This Area, so that switching an area on
   * never adds a question to the morning. The namespace is declared once, on the
   * domain, rather than in a second list here that would drift out of step with it.
   */
  if (
    DOMAIN_LIST.some(
      (definition) =>
        definition.captureNamespace !== undefined &&
        id.startsWith(`${definition.captureNamespace}:`),
    )
  ) {
    return 'update-this-area';
  }
  // State, context, sleep, food, and capture are all collected by a guide or the
  // quick check-in behind "Update state".
  if (
    id.startsWith('state:') ||
    id.startsWith('context:') ||
    id.startsWith('sleep:') ||
    id.startsWith('food:') ||
    id.startsWith('capture:')
  ) {
    return 'guide';
  }
  return undefined;
}

export interface OwnershipViolation {
  readonly promptId: string;
  readonly detail: string;
}

/**
 * Checks the catalogue.
 *
 * Two rules: every prompt has an owner, and no prompt id appears twice. The second
 * sounds redundant when the catalogue is one array — it stops being redundant the
 * moment a slice appends its own prompts, which is exactly when the check earns its
 * place.
 */
export function checkPromptOwnership(
  prompts: readonly CapturePrompt[] = ALL_PROMPTS,
): readonly OwnershipViolation[] {
  const violations: OwnershipViolation[] = [];
  const seen = new Set<string>();

  for (const prompt of prompts) {
    if (seen.has(prompt.promptId)) {
      violations.push({
        promptId: prompt.promptId,
        detail: 'Defined more than once, so two surfaces would both believe they own it',
      });
    }
    seen.add(prompt.promptId);

    if (ownerOf(prompt) === undefined) {
      violations.push({
        promptId: prompt.promptId,
        detail:
          'No surface owns this question. Give it an owning prefix rather than letting whoever asks first take it',
      });
    }
  }

  return violations;
}

/**
 * Enabled domains whose "Update This Area" prompt has not been written.
 *
 * A domain declares its update prompt id in its definition, and the prompt itself
 * arrives with the slice. This reports the gap so a slice cannot enable a domain that
 * has no way to be updated — which would leave the owner able to read an area and
 * unable to correct it.
 */
export function domainsMissingUpdatePrompt(
  enabledDomainIds: readonly string[],
  prompts: readonly CapturePrompt[] = ALL_PROMPTS,
): readonly string[] {
  const available = new Set(prompts.map((prompt) => prompt.promptId));
  return DOMAIN_LIST.filter(
    (definition) =>
      enabledDomainIds.includes(definition.id) && !available.has(definition.updatePromptId),
  ).map((definition) => definition.id);
}
