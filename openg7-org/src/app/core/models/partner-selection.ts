import { PartnerProfile } from './partner-profile';

export type PartnerSelection = `${PartnerProfile['role']}:${string}`;

export interface PartnerSelectionResult {
  readonly role: PartnerProfile['role'];
  readonly id: string;
}

/**
 * Contexte : Called by matchmaking flows when serialising a selected partner into query params or storage.
 * Raison d’être : Produces a stable identifier format understood by selectors and connection builders.
 * @param role Partner role that initiated the selection.
 * @param id Original identifier of the partner record.
 * @returns A namespaced selection token combining role and id.
 */
export function createPartnerSelection(
  role: PartnerProfile['role'],
  id: string | number,
): PartnerSelection {
  const value = String(id ?? '').trim();
  return `${role}:${value}` as PartnerSelection;
}

/**
 * Contexte : Used by routing and storage helpers to interpret previously serialised partner selections.
 * Raison d’être : Safely extracts the role and identifier parts so downstream services receive structured data.
 * @param value Raw token to decode, typically sourced from URL state.
 * @returns Parsed selection details or null when the token is invalid.
 */
export function parsePartnerSelection(
  value: string | null | undefined,
): PartnerSelectionResult | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const [rolePart, idPart] = trimmed.split(':', 2);
  if (rolePart === 'buyer' || rolePart === 'supplier') {
    return { role: rolePart, id: (idPart ?? '').trim() };
  }
  return { role: 'supplier', id: trimmed };
}
