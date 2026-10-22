/**
 * Stable ids (spec: `docs/stable-ids.md`).
 *
 * Ids are derived from content, never assigned, so two independent processes that see
 * the same thing agree on its identity — and re-importing the same record twice
 * collapses onto the same id, which is what makes ingest idempotent.
 */

import { createHash } from 'node:crypto'

/**
 * Name normalisation: lowercase → NFKD → strip combining marks → collapse
 * whitespace → trim. "José  García" and "jose garcia" are the same name.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function hashId(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex')
}

/** The name-keyed entity id: `ent_<sha256(type:normalizedName).slice(0,16)>`. */
export function entityIdFromName(type: string, name: string): string {
  return `ent_${hashId([`${type}:${normalizeName(name)}`]).slice(0, 16)}`
}

/** The externally-keyed entity id: `type:system:externalId`. */
export function entityIdFromExternalKey(type: string, system: string, id: string): string {
  return `${type}:${system}:${id}`
}

/** The relationship id: a hash over from + type + to + context + validFrom. */
export function relationId(
  from: string,
  type: string,
  to: string,
  context: string | undefined,
  validFrom: string,
): string {
  return `rel_${hashId([from, type, to, context ?? '', validFrom]).slice(0, 16)}`
}
