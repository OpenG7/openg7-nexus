export type OpportunityMatchLayout =
  | 'standard'
  | 'tile'
  | 'mini-map'
  | 'subway'
  | 'radar'
  | 'timeline'
  | 'compact-kpi'
  | 'swipe-stack'
  | 'impact-banner'
  | 'two-way';

export const OPPORTUNITY_MATCH_LAYOUTS: readonly OpportunityMatchLayout[] = Object.freeze([
  'standard',
  'tile',
  'mini-map',
  'subway',
  'radar',
  'timeline',
  'compact-kpi',
  'swipe-stack',
  'impact-banner',
  'two-way',
]);

export const DEFAULT_OPPORTUNITY_MATCH_LAYOUT: OpportunityMatchLayout = 'standard';

/**
 * Contexte : Used by router resolvers and filters when validating layout values coming from query params.
 * Raison d’être : Guards downstream UI logic by ensuring only supported layout identifiers are accepted.
 * @param value Candidate value read from user input or persisted settings.
 * @returns True when the candidate matches one of the known layout identifiers.
 */
export function isOpportunityMatchLayout(value: unknown): value is OpportunityMatchLayout {
  return (
    typeof value === 'string' && (OPPORTUNITY_MATCH_LAYOUTS as readonly string[]).includes(value)
  );
}
