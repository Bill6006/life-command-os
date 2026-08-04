import type { DomainId } from '../domains/definitions';
import { FATHERHOOD_CAPTURES } from '../fatherhood/capture';
import type { ContextualCapture } from './contextualCapture';

/**
 * Every domain's contextual-capture declarations, in one list.
 *
 * A read-only aggregation, and deliberately nothing more. It exists so that a surface
 * can ask "which enabled areas offer a Quick Capture route" without knowing that
 * fatherhood exists — the alternative is a component with a list of domain names in it,
 * which is the coupling the shared framework was built to remove.
 *
 * Phase 8's orchestrator will read this same list to decide what to ask and when.
 * Nothing here decides anything.
 */
export const ALL_CONTEXTUAL_CAPTURES: readonly ContextualCapture[] = [...FATHERHOOD_CAPTURES];

export function capturesForDomain(domainId: DomainId): readonly ContextualCapture[] {
  return ALL_CONTEXTUAL_CAPTURES.filter((capture) => capture.domainId === domainId);
}

export function captureById(id: string): ContextualCapture | undefined {
  return ALL_CONTEXTUAL_CAPTURES.find((capture) => capture.id === id);
}

export interface QuickCaptureOption {
  readonly kind: string;
  readonly domainId: DomainId;
}

/**
 * The domain-specific Quick Capture routes available right now.
 *
 * Only for areas the owner has switched on. An area that is off offers nothing, which
 * keeps the capture screen as short as the owner's actual life rather than as long as
 * the product roadmap.
 */
export function quickCaptureOptions(
  enabledDomainIds: readonly DomainId[],
): readonly QuickCaptureOption[] {
  return ALL_CONTEXTUAL_CAPTURES.flatMap((capture) =>
    capture.captureClass === 'quick-capture' &&
    capture.quickCaptureKind !== undefined &&
    enabledDomainIds.includes(capture.domainId)
      ? [{ kind: capture.quickCaptureKind, domainId: capture.domainId }]
      : [],
  );
}
