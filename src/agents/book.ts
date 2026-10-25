/**
 * The book — the exchange's registry of agent **numbers**.
 *
 * A book's row is a **number before it is a person**. The number exists first; the
 * identity is claimed from it afterwards. That is the shape the exchange inherits
 * from the platform it grew out of, and it is the reason an agent here carries a
 * book number instead of a name it made up.
 *
 * Two numbers, one identity:
 *
 *  - the **account** — 10 digits: a 9-digit payload (a head prefix that scopes the
 *    number to a place, plus a serial) and one Luhn check digit. The check digit is
 *    what makes a mistyped number detectable instead of merely wrong.
 *  - the **card** — 16 digits, a **projection** of the account, never a second mint:
 *    a closed-loop MII, a 4-digit region, the account verbatim, and a Luhn digit
 *    over the whole body. The account is the identity; the card is the account
 *    written wider, and it is what a human reads.
 *
 * The card is shown masked and never in full.
 *
 * **What the book issues, and what it does not.** The book issues the **number**.
 * The **wallet and the key stay the agent's own** — the sample agents keep the
 * addresses the pre-existing sample data gives them, and a new claimant declares
 * its own. The exchange does not mint wallets, does not mint keys, and never signs
 * for an address it does not control. That split is the whole point: a number is
 * the exchange's to issue; a wallet is the agent's to control.
 *
 * **What is reproduced here, and what is not.** The *shape* is reproduced: a 10-digit
 * Luhn account, a place-scoped head prefix, and a closed-loop 16-digit card
 * projected from the account. Those are standard constructions, not a secret. What is
 * **not** reproduced is the pre-existing platform's own derivation of its numbers,
 * its ward-prefix catalog, and its live book — those stay private, and
 * `PRE-EXISTING.md` says so in the same words. This repository carries a small
 * book of its own, listed row by row in `data/agent-book.json`.
 *
 * The book is the **only** way a number is born in this repository. There is no
 * second mint, no ad-hoc account number, and no path that invents one.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AgentId, AgentIdentity } from '../types.ts'
import { ROOT } from '../root.ts'

// ---------------------------------------------------------------------------
// The number shape
// ---------------------------------------------------------------------------

/** The Luhn check digit for a payload. One digit, always. */
export function luhnCheckDigit(payload: string): string {
  let sum = 0
  let alt = false
  for (let i = payload.length - 1; i >= 0; i--) {
    let n = Number(payload[i])
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return String((10 - (sum % 10)) % 10)
}

/** True when the digits carry a valid Luhn check digit. */
export function isLuhn(digits: string): boolean {
  const d = digits.replace(/\D/g, '')
  if (d.length < 2) return false
  return luhnCheckDigit(d.slice(0, -1)) === d.slice(-1)
}

/**
 * Mint one account number: the head prefix, the serial, the check digit.
 *
 * The head prefix **sets** the serial's width, so every account is exactly nine
 * payload digits. A 5-digit head (an organisation or a ward-scoped head) gets a
 * 4-digit serial window; a 4-digit head (a region) gets the full 5-digit window.
 */
export function mintAccount(head: string, serial: number): string {
  const h = String(head)
  if (!/^\d{4,5}$/.test(h)) throw new Error('A book head must be a 4- or 5-digit prefix.')
  if (!Number.isInteger(serial) || serial < 0) throw new Error('A book serial must be a whole number.')
  const width = 9 - h.length
  const payload = `${h}${String(serial).padStart(width, '0').slice(-width)}`
  return `${payload}${luhnCheckDigit(payload)}`
}

/**
 * Project the card from the account — a deterministic widening, never a second mint.
 *
 *   9        the MII: a closed loop, not a network card
 *   7100     the region: ISO 3166-1 numeric, zero-padded, plus a trailing zero
 *   1010101010   the account, exactly as minted
 *   L        the Luhn digit over the whole body
 */
export function cardFromAccount(account: string, isoNumeric3: string): string {
  const a = String(account).replace(/\D/g, '')
  if (a.length !== 10 || !isLuhn(a)) throw new Error('A book account must be 10 digits and Luhn-valid.')
  const region = String(isoNumeric3).replace(/\D/g, '')
  if (region.length === 0 || region.length > 3) throw new Error('ISO 3166-1 numeric must be 1-3 digits.')
  const body = `9${region.padStart(3, '0')}0${a}`
  return `${body}${luhnCheckDigit(body)}`
}

/** The account behind a card — the projection, read back. */
export function accountFromCard(card: string): string {
  const d = String(card).replace(/\D/g, '')
  if (d.length !== 16 || !d.startsWith('9')) throw new Error('A book card must be 16 digits starting 9.')
  const account = d.slice(5, 15)
  if (!isLuhn(account)) throw new Error('The card body is not a valid book account.')
  return account
}

/** The card, masked. The only form that ever reaches a page. */
export function maskedCard(card: string): string {
  const d = String(card).replace(/\D/g, '')
  if (d.length !== 16) return '•••• •••• •••• ••••'
  return `${d.slice(0, 6)} •••• •••• ${d.slice(12)}`
}

// ---------------------------------------------------------------------------
// The book itself
// ---------------------------------------------------------------------------

/** One row of the book. A number, and the name that holds it. */
export interface BookRow {
  /** The serial inside the head. The number is the head plus the serial. */
  serial: number
  /** The head the number is scoped to. */
  head: string
  /** ISO 3166-1 numeric for the region the card carries. */
  isoNumeric3: string
  /** The name the number is held under. */
  displayName: string
  /** `dormant` until an identity claims the row. */
  status: 'dormant' | 'active'
}

interface BookFile {
  $comment?: string
  rows: Array<Omit<BookRow, 'status'> & { status?: 'dormant' | 'active' }>
}

/** The rows, exactly as the book file carries them. */
export function loadBook(): BookRow[] {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'data/agent-book.json'), 'utf8'),
  ) as BookFile
  return raw.rows.map((row) => ({ ...row, status: row.status ?? 'dormant' }))
}

/** The account number a row holds. */
export function numberForRow(row: BookRow): string {
  return mintAccount(row.head, row.serial)
}

/** The agent id a row holds — the number, named. The id and the number cannot drift. */
export function agentIdForRow(row: BookRow): AgentId {
  return `AGT-${numberForRow(row)}` as AgentId
}

/**
 * Bind a named agent to its row in the book.
 *
 * The sample data names the agent; the book says what the agent **is** — the number
 * it holds. The binding replaces the id and leaves everything else alone: the
 * wallet and the key fingerprint stay the **agent's own**, because the book issues
 * numbers and the exchange does not mint wallets or keys.
 *
 * A name the book does not carry is a **hard error**: the exchange does not invent
 * a number for an agent it cannot point at a book row for, and a listing without a
 * number has nothing to certify. Only a row that is **in use** can be bound — a
 * dormant row is a number waiting for its owner, and a listing cannot borrow it.
 */
export function bindAgentToBook(agent: AgentIdentity): AgentIdentity {
  const row = loadBook().find((candidate) => candidate.displayName === agent.displayName)
  if (!row) {
    throw new Error(`The book has no row for the agent named ${agent.displayName}.`)
  }
  if (row.status !== 'active') {
    throw new Error(`The book row for ${row.displayName} is dormant and cannot be bound.`)
  }
  return { ...agent, agentId: agentIdForRow(row) }
}

/** The card a row projects to, masked. */
export function maskedCardForRow(row: BookRow): string {
  return maskedCard(cardFromAccount(numberForRow(row), row.isoNumeric3))
}

/** The account number an agent id carries, or null when the id is not a book id. */
export function accountFromAgentId(agentId: string): string | null {
  const raw = String(agentId)
  const account = raw.startsWith('AGT-') ? raw.slice(4) : raw
  if (!/^\d{10}$/.test(account) || !isLuhn(account)) return null
  return account
}

/** The masked card an agent id projects to, or null when the id is not a book id. */
export function maskedCardForAgentId(agentId: string): string | null {
  const account = accountFromAgentId(agentId)
  if (account === null) return null
  const row = loadBook().find((candidate) => numberForRow(candidate) === account)
  if (!row) return null
  return maskedCardForRow(row)
}

/** The book row an agent id names, or null. */
export function rowForAgentId(agentId: string): BookRow | null {
  const account = accountFromAgentId(agentId)
  if (account === null) return null
  return loadBook().find((row) => numberForRow(row) === account) ?? null
}

// ---------------------------------------------------------------------------
// Claiming
// ---------------------------------------------------------------------------

/**
 * The claims made in this process. A claim is a flip of a row from `dormant` to
 * `active`, and it happens exactly once per row: a row that has been claimed is
 * never handed out a second time, the same way the book is only ever claimed once.
 *
 * The claim lives in the process, not on disk: the book file is the catalogue, and
 * the process is the exchange that is trading against it right now.
 */
const claimed = new Set<string>()

/** The rows this process has already handed out. */
export function claimedAccounts(): string[] {
  return [...claimed].sort()
}

/** What a claim hands back. The number is the exchange's; the wallet is the agent's. */
export interface BookClaim {
  /** The identity: the issued number, and the claimant's own wallet and key. */
  identity: AgentIdentity
  /** The account number that was issued. */
  account: string
  /** The card that number projects to, masked. The whole card is never handed out. */
  maskedCard: string
}

/**
 * Claim a number from the book.
 *
 * The exchange issues the **number**; the claimant keeps its **own** wallet and key
 * fingerprint. That split is deliberate: a number is the exchange's to issue, a
 * wallet is the agent's to control, and the exchange does not mint either one it
 * cannot stand behind.
 *
 * The next dormant row is claimed. A row that has been claimed is **not** handed
 * out twice: the book is finite, and the exchange does not invent numbers to
 * cover the gap.
 */
export function claimFromBook(input: {
  /** The name the claimant wants the number held under. */
  displayName: string
  /** The claimant's own address — where its settlement leg goes. */
  walletAddress: string
  /** The claimant's own key fingerprint. */
  agentKeyHash: string
  /** A number the claimant already holds, when it is asking for that one. */
  agentId?: string
}): BookClaim {
  const rows = loadBook()
  const wanted = input.agentId ? accountFromAgentId(input.agentId) : null
  if (input.agentId && wanted === null) {
    throw new Error('That agent id is not a number this book could have issued.')
  }
  const row = wanted === null
    ? rows.find((candidate) => {
        if (candidate.status !== 'dormant') return false
        return !claimed.has(numberForRow(candidate))
      })
    : rows.find((candidate) => numberForRow(candidate) === wanted)

  if (!row) throw new Error('The book has no dormant row left to claim.')
  if (row.status !== 'dormant') {
    throw new Error(`The book number for ${row.displayName} is already issued.`)
  }

  const account = numberForRow(row)
  if (claimed.has(account)) {
    throw new Error(`The book number for ${row.displayName} is already claimed.`)
  }
  claimed.add(account)

  return {
    identity: {
      agentId: agentIdForRow(row),
      agentKeyHash: input.agentKeyHash,
      walletAddress: input.walletAddress,
      displayName: input.displayName,
    },
    account,
    maskedCard: maskedCardForRow(row),
  }
}
