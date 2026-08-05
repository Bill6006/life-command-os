/**
 * What this domain records about other people, and what it refuses to.
 *
 * ## It is not a CRM, and the shape of the data is why
 *
 * There is **no person record**. Nothing here stores a name, a relationship type, a
 * contact, a history with an individual, or a last-contacted date. Every observation is
 * about what the *owner* did — reached out, held a boundary, went back after a row — and
 * the other person appears only as an unnamed participant.
 *
 * That is deliberate and load-bearing. The moment this app holds a list of people with
 * notes attached, it is a surveillance tool pointed at the owner's family, it is a
 * privacy liability nobody asked for, and it invites exactly the score-keeping about
 * relationships that ruins them. The Blueprint forbids a contact CRM; the absence of a
 * person family is what makes that structural rather than a promise.
 *
 * ## Interactions are counted, never rated
 *
 * "Did the conversation happen" is observable. "How did it go" is a judgement the owner
 * would have to invent about someone else's inner life, and it is not asked.
 */

/** The kinds of contact worth distinguishing, because they cost different things. */
export const CONNECTION_KINDS = [
  { id: 'in-person', label: 'In person' },
  { id: 'call-or-video', label: 'A call or video' },
  { id: 'message', label: 'Messages back and forth' },
  { id: 'none-today', label: 'Nothing today' },
] as const;
export type ConnectionKindId = (typeof CONNECTION_KINDS)[number]['id'];

/**
 * Social practice: the thing that was deliberately attempted.
 *
 * Practice rather than performance. Each is something with an observable outcome that
 * does not depend on how the other person responded — sending a message is done when it
 * is sent, and a reply is not part of the task.
 */
export const SOCIAL_PRACTICES = [
  { id: 'started-a-conversation', label: 'Started a conversation' },
  { id: 'made-a-plan', label: 'Made a plan with someone' },
  { id: 'asked-for-something', label: 'Asked for something I needed' },
  { id: 'said-no', label: 'Said no to something' },
  { id: 'stayed-longer', label: 'Stayed longer than I wanted to leave' },
  { id: 'asked-someone-out', label: 'Asked someone out' },
  { id: 'went-on-a-date', label: 'Went on a date' },
] as const;
export type SocialPracticeId = (typeof SOCIAL_PRACTICES)[number]['id'];

export const PRACTICE_LABELS: Record<string, string> = Object.fromEntries(
  SOCIAL_PRACTICES.map((practice) => [practice.id, practice.label]),
);

/**
 * What the owner decided to hold, in his own words.
 *
 * A boundary is stored as a decision with an observable follow-up — did the thing you
 * decided actually happen — and never as a rule about another person's behaviour. The
 * difference matters: one is something he controls, the other is a grievance with a
 * timestamp.
 */
export const BOUNDARY_OUTCOMES = [
  { id: 'held', label: 'Held it' },
  { id: 'partly', label: 'Partly' },
  { id: 'did-not', label: 'Did not this time' },
  { id: 'not-tested', label: 'It did not come up' },
] as const;
export type BoundaryOutcomeId = (typeof BOUNDARY_OUTCOMES)[number]['id'];

/** After a conflict: what actually happened next, observably. */
export const REPAIR_OUTCOMES = [
  { id: 'made-contact', label: 'I went back to them' },
  { id: 'they-made-contact', label: 'They came back to me' },
  { id: 'both', label: 'We both did' },
  { id: 'not-yet', label: 'Not yet' },
] as const;
export type RepairOutcomeId = (typeof REPAIR_OUTCOMES)[number]['id'];

/**
 * After a knock-back: what the owner did next.
 *
 * Recovery is measured by re-entry, not by mood. "Did you try again" is answerable;
 * "have you got over it" is not, and asking would be asking him to grade himself.
 */
export const REJECTION_RESPONSES = [
  { id: 'tried-again', label: 'Tried again since' },
  { id: 'stopped-for-now', label: 'Stopped for now' },
  { id: 'not-decided', label: 'Have not decided' },
] as const;
export type RejectionResponseId = (typeof REJECTION_RESPONSES)[number]['id'];

/* -------------------------------------------------------------------------- */
/* Attributes                                                                   */
/* -------------------------------------------------------------------------- */

export const EMOTIONAL_ATTRIBUTES = {
  connection: 'emotional:connection',
  interference: 'emotional:interference',
  practice: 'emotional:practice',
  reachedOut: 'emotional:reached-out',
  boundaryDecided: 'emotional:boundary-decided',
  boundaryOutcome: 'emotional:boundary-outcome',
  conflictOpen: 'emotional:conflict-open',
  repairOutcome: 'emotional:repair-outcome',
  rejectionResponse: 'emotional:rejection-response',
  note: 'emotional:note',
} as const;
