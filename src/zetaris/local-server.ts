/**
 * A protocol-compatible Zetaris server.
 *
 * Zetaris is a **declared deviation** in this submission: no live instance was ever
 * reachable (the managed AWS stack stalled at account-binding and billing; the local
 * install needs Docker and 8 GB of RAM that this machine does not have). What we
 * ship instead is this server — the **server side** of the published REST contract —
 * so that the **client** in `adapter.ts` is real: it builds the published requests,
 * sends them over HTTP with the published headers, and parses the published
 * responses.
 *
 * The important line: **the stub is on this side, never inside the client.** The
 * adapter does not know this server exists. Point it at a live instance by changing
 * one environment variable and nothing in the client changes.
 *
 * The routes are the published ones:
 *
 *   GET    /api/v1.0/auth/login                     -> { idToken, refreshToken }
 *   GET    /api/v1.0/auth/refresh                   -> { idToken, refreshToken }
 *   POST   /api/v1.0/query/sql/start                -> OpenSqlResponse
 *   GET    /api/v1.0/query/sql/page                 -> PageSqlResponse
 *   DELETE /api/v1.0/query/sql/close/{queryToken}   -> 200
 *   GET    /health                                  -> the local health line
 *
 * The SQL it answers is a small, bounded grammar — `SELECT * FROM t`,
 * `SELECT a, b FROM t`, `SELECT ... FROM t WHERE a = 'x' AND b = 1`, and `SELECT 1`:
 *
 *   SELECT <columns|*> FROM <table> [WHERE <col> = <literal> [AND ...]]
 *
 * No engine, no `eval`, no arbitrary expressions. A query it cannot parse is a
 * 400, exactly as a real instance would answer a query it cannot run.
 */

import type { ZetarisRow } from './adapter.ts'

/** The tables this server serves, keyed by name. */
export type ZetarisTables = Record<string, ZetarisRow[]>

export interface LocalServerOptions {
  /** The tables to serve. The caller loads them from disk — this file reads nothing. */
  tables: ZetarisTables
  /** The port to bind. 0 asks the OS for an ephemeral one. */
  port?: number
  /** The numeric organisation id the requests must carry. */
  orgId?: number
  /** The credentials the local instance accepts. */
  username?: string
  password?: string
}

export interface LocalServer {
  url: string
  port: number
  orgId: number
  username: string
  password: string
  /** Every request the server answered, in order — the selftest prints it. */
  log: Array<{ method: string; path: string; requestId: string; status: number; authorised: boolean }>
  stop(): void
}

/** The credential the local instance issues. */
const ID_TOKEN_PREFIX = 'local-id-'
const REFRESH_TOKEN_PREFIX = 'local-refresh-'

const json = (payload: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

const text = (body: string, status: number, headers: Record<string, string> = {}): Response =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain', ...headers } })

/**
 * Run one bounded SELECT over one table.
 *
 * `SELECT 1` is the health query the adapter's `health()` uses, and it answers the
 * same on a real instance.
 */
export function runSelect(sql: string, tables: ZetarisTables): ZetarisRow[] {
  const trimmed = sql.trim().replace(/;+\s*$/, '')
  if (trimmed === '') throw new Error('The query is empty.')

  const literal = trimmed.match(/^select\s+1$/i)
  if (literal) return [{ value: 1 }]

  const parsed = /^select\s+(.+?)\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:where\s+(.+))?$/i.exec(trimmed)
  if (!parsed) throw new Error(`Unsupported query: ${trimmed}`)

  const projection = (parsed[1] ?? '*').trim()
  const tableName = (parsed[2] ?? '').toLowerCase()
  const where = parsed[3]

  const rows = tables[tableName]
  if (!rows) throw new Error(`Unknown table: ${tableName}`)

  let selected = rows
  if (where !== undefined && where.trim() !== '') {
    selected = rows.filter((row) => matches(row, where))
  }

  if (projection === '*') return selected.map((row) => ({ ...row }))

  const columns = projection.split(',').map((column) => column.trim())
  return selected.map((row) => {
    const projected: ZetarisRow = {}
    for (const column of columns) {
      projected[column] = row[column]
    }
    return projected
  })
}

/** `WHERE a = 'x' AND b = 1` — equality only, and only on real columns. */
function matches(row: ZetarisRow, where: string): boolean {
  const clauses = where.split(/\s+and\s+/i)
  for (const clause of clauses) {
    const parsed = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(clause.trim())
    if (!parsed) throw new Error(`Unsupported WHERE clause: ${clause.trim()}`)
    const column = parsed[1] ?? ''
    const raw = (parsed[2] ?? '').trim()
    const value = raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1) : raw
    const actual = row[column]
    const matchesValue = typeof actual === 'number' ? String(actual) === value : String(actual) === value
    if (!matchesValue) return false
  }
  return true
}

/**
 * Start the server. Returns the URL the client should talk to.
 */
export function startZetarisLocalServer(options: LocalServerOptions): LocalServer {
  const orgId = options.orgId ?? 1
  const username = options.username ?? 'conquest'
  const password = options.password ?? 'conquest-local'
  const issued = new Set<string>()
  const openQueries = new Map<string, { rows: ZetarisRow[]; pageLimit: number }>()
  const log: LocalServer['log'] = []

  const authorised = (request: Request): boolean => {
    const header = request.headers.get('Authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
    return token !== '' && issued.has(token)
  }

  const headersLookRight = (request: Request): boolean => {
    const org = request.headers.get('X-Org-ID') ?? ''
    const requestId = request.headers.get('X-Request-ID') ?? ''
    return /^\d+$/.test(org) && /^[0-9a-f-]{36}$/i.test(requestId)
  }

  const server = Bun.serve({
    port: options.port ?? 0,
    async fetch(request) {
      const url = new URL(request.url)
      const method = request.method
      const requestId = request.headers.get('X-Request-ID') ?? ''
      const path = url.pathname
      let status = 200
      let response: Response = new Response(null, { status: 500 })
      const authed = authorised(request)

      try {
        if (path === '/health' && method === 'GET') {
          response = json({
            status: 'ok',
            mode: 'local',
            tables: Object.keys(options.tables).sort(),
            openQueries: openQueries.size,
          })
        } else if (path === '/api/v1.0/auth/login' && method === 'GET') {
          const header = request.headers.get('Authorization') ?? ''
          const expected = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
          if (header !== expected) {
            status = 401
            response = json({ msg: 'The credentials were refused.' }, status)
          } else {
            const idToken = `${ID_TOKEN_PREFIX}${crypto.randomUUID()}`
            const refreshToken = `${REFRESH_TOKEN_PREFIX}${crypto.randomUUID()}`
            issued.add(idToken)
            issued.add(refreshToken)
            response = json({ idToken, refreshToken })
          }
        } else if (path === '/api/v1.0/auth/refresh' && method === 'GET') {
          const header = request.headers.get('Authorization') ?? ''
          const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
          if (!issued.has(token)) {
            status = 401
            response = json({ msg: 'The refresh token was refused.' }, status)
          } else {
            const idToken = `${ID_TOKEN_PREFIX}${crypto.randomUUID()}`
            issued.add(idToken)
            response = json({ idToken, refreshToken: token })
          }
        } else if (path === '/api/v1.0/query/sql/start' && method === 'POST') {
          if (!authed || !headersLookRight(request)) {
            status = 400
            response = text('Invalid value for: header X-Request-ID, Invalid value for: header X-Org-ID', status)
          } else {
            const body = (await request.json()) as { select?: string; pageLimit?: number }
            const select = body.select ?? ''
            const pageLimit = body.pageLimit ?? 100
            if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100) {
              status = 400
              response = text('Invalid value for: body', status)
            } else {
              let rows: ZetarisRow[]
              try {
                rows = runSelect(select, options.tables)
              } catch (error) {
                status = 400
                response = text(error instanceof Error ? error.message : 'Invalid value for: body', status)
                rows = []
              }
              if (status === 200) {
                const queryToken = `q-${crypto.randomUUID()}`
                openQueries.set(queryToken, { rows, pageLimit })
                const totalCount = rows.length
                const totalPages = Math.max(1, Math.ceil(totalCount / pageLimit))
                response = json({
                  records: rows.slice(0, pageLimit),
                  pageNumber: 1,
                  pageLimit,
                  totalCount,
                  totalPages,
                  queryToken,
                })
              }
            }
          }
        } else if (path === '/api/v1.0/query/sql/page' && method === 'GET') {
          if (!authed || !headersLookRight(request)) {
            status = 400
            response = text('Invalid value for: header X-Request-ID, Invalid value for: header X-Org-ID', status)
          } else {
            const queryToken = url.searchParams.get('queryToken') ?? ''
            const pageLimit = Number(url.searchParams.get('pageLimit') ?? '100')
            const pageNumber = Number(url.searchParams.get('pageNumber') ?? '1')
            const open = openQueries.get(queryToken)
            if (!open || !Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100 || pageNumber < 1) {
              status = 400
              response = text('Invalid value for: query parameter queryToken, Invalid value for: query parameter pageLimit', status)
            } else {
              const start = (pageNumber - 1) * pageLimit
              const totalCount = open.rows.length
              const totalPages = Math.max(1, Math.ceil(totalCount / open.pageLimit))
              response = json({
                queryToken,
                pageNumber,
                records: open.rows.slice(start, start + pageLimit),
                totalCount,
                totalPages,
              })
            }
          }
        } else if (path.startsWith('/api/v1.0/query/sql/close/') && method === 'DELETE') {
          if (!authed || !headersLookRight(request)) {
            status = 400
            response = text('Invalid value for: header X-Request-ID, Invalid value for: header X-Org-ID', status)
          } else {
            const queryToken = decodeURIComponent(path.slice('/api/v1.0/query/sql/close/'.length))
            openQueries.delete(queryToken)
            response = new Response(null, { status: 200 })
          }
        } else {
          status = 404
          response = json({ msg: `No route for ${method} ${path}.` }, status)
        }
      } catch (error) {
        status = 500
        response = json({ msg: error instanceof Error ? error.message : 'unknown failure' }, status)
      }

      status = response.status
      log.push({ method, path, requestId, status, authorised: authed })
      return response
    },
  })

  const boundPort = server.port ?? options.port ?? 0

  return {
    url: `http://127.0.0.1:${boundPort}`,
    port: boundPort,
    orgId,
    username,
    password,
    log,
    stop(): void {
      server.stop(true)
    },
  }
}
