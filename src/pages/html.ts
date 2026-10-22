/**
 * The HTML primitives — escaping and formatting.
 *
 * Every value that reaches a page goes through `escape()`. No value is trusted: a
 * listing id, an agent name and a certificate id are all strings that arrived from
 * somewhere else, and a page that interpolates them raw is a page that can lie.
 *
 * **Whole rand only.** No cent denomination reaches a page, so the formatter takes
 * an integer and prints it as rand.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escape anything for interpolation into HTML. */
export const escape = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character)

/** `R1,440` — whole rand, grouped. `null` prints as an em dash, never as a zero. */
export const rand = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—'
  const grouped = String(Math.trunc(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `R${grouped}`
}

/** `12 months` — the term a listing buys. */
export const term = (months: number | null | undefined): string => {
  if (months === null || months === undefined || !Number.isFinite(months)) return '—'
  return `${months} ${months === 1 ? 'month' : 'months'}`
}

/** A confidence as a percentage, or an em dash when the step had no score. */
export const confidence = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${Math.round(value * 100)}%`
}

/** Shorten a long identifier for a table cell, keeping both ends readable. */
export const short = (value: string, keep = 18): string => {
  if (value.length <= keep) return value
  const head = Math.ceil((keep - 1) / 2)
  const tail = keep - head - 1
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`
}

/** A `data-*` or class name safe slug. */
export const slug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Join a list of strings into readable prose. */
export const list = (values: string[], conjunction = 'and'): string => {
  if (values.length === 0) return 'none'
  if (values.length === 1) return values[0] ?? ''
  return `${values.slice(0, -1).join(', ')} ${conjunction} ${values[values.length - 1] ?? ''}`
}
