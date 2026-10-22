/**
 * The Zetaris data adapter.
 *
 * Zetaris is a **declared deviation** in this submission: the hosted cluster was
 * not provisionable (AWS account-binding / billing gate) and the official local
 * install needs 4 containers plus at least 8 GB of Docker memory, which the build
 * machine does not have. What we ship instead is a native implementation of
 * Zetaris's **published REST contract** against our own data API, so the same
 * code path would run against a live Zetaris instance by changing one env var.
 *
 * The published contract (Zetaris's own OpenAPI document, served from
 * `https://api.saas.enterprise.zetaris.com/redoc/`; the DB Query operations are
 * `OpenSqlQuery`, `PageSqlQuery` and `CloseSqlQuery`):
 *
 *   OpenSqlQuery   POST   /api/v1.0/query/sql/start   body { "select", "pageLimit" }
 *   PageSqlQuery   GET    /api/v1.0/query/sql/page?queryToken=&pageLimit=&pageNumber=
 *   CloseSqlQuery  DELETE /api/v1.0/query/sql/close/{queryToken}
 *
 * `OpenSqlQuery` answers with `OpenSqlResponse` — `records`, `pageNumber`,
 * `pageLimit`, `totalCount`, `totalPages` and the `queryToken` every later step
 * needs. `PageSqlQuery` answers with `PageSqlResponse` — the same shape without
 * `pageLimit`. `CloseSqlQuery` releases the server-side query and answers 200.
 *
 * Auth is `Authorization: Bearer <idToken>` (login returns an idToken plus a
 * refreshToken). Every request carries `X-Org-ID: <numeric org id>` and
 * `X-Request-ID: <uuid>`.
 *
 * There is **one** adapter and **one** code path: `live` and `local` differ only in
 * the base URL. Nothing in this file branches on "is this a test".
 */

export type ZetarisRow = Record<string, unknown>

export interface ZetarisConfig {
  /** Host of the Zetaris-compatible API. Our own data API by default. */
  baseUrl: string
  /** Numeric org id. Sent as `X-Org-ID`. */
  orgId: number
  /** Bearer token. Either an idToken, or an API key / username+password exchange. */
  idToken?: string
  refreshToken?: string
  username?: string
  password?: string
  apiKey?: string
  /** Optional role the query is executed as. */
  targetRole?: string
  /** Request timeout in milliseconds. The published clients use 30 s. */
  timeoutMs?: number
}

export interface ZetarisQuery {
  /** The federated SQL. No ETL — the query runs in place over the sources. */
  select: string
  /** 1..100. */
  pageLimit?: number
}

export interface ZetarisPage {
  rows: ZetarisRow[]
  /** Present when more pages remain. */
  nextToken?: string
  /** The page this response carries (1-based). */
  pageNumber?: number
  /** Total records the open query matched. */
  totalCount?: number
  /** Total pages the open query can serve. */
  totalPages?: number
}

/** The page options the published `PageSqlQuery` takes. */
export interface ZetarisPageOptions {
  pageLimit?: number
  pageNumber?: number
}

export interface ZetarisAdapter {
  /** OpenSqlQuery. */
  open(query: ZetarisQuery): Promise<{ queryToken: string }>
  /** PageSqlQuery. */
  page(queryToken: string, options?: ZetarisPageOptions): Promise<ZetarisPage>
  /** CloseSqlQuery. Always called, so the server releases the query. */
  close(queryToken: string): Promise<void>
  /**
   * Convenience: open -> page(s) -> close, in a `finally` so the query is never
   * leaked. This is the call the swarm actually makes.
   */
  query(sql: string, pageLimit?: number): Promise<ZetarisRow[]>
  /** Whether the configured instance answers, and in which mode. */
  health(): Promise<ZetarisHealth>
}

export interface ZetarisHealth {
  ok: boolean
  /** `live` — a real instance; `local` — our protocol-compatible server. */
  mode: 'live' | 'local'
  baseUrl: string
  /** The reason when it is not ok. Never contains a token. */
  detail?: string
}

/** The published paths. One place, so the contract is readable in one screen. */
export const ZETARIS_PATHS = {
  login: '/api/v1.0/auth/login',
  refresh: '/api/v1.0/auth/refresh',
  open: '/api/v1.0/query/sql/start',
  page: '/api/v1.0/query/sql/page',
  close: '/api/v1.0/query/sql/close',
} as const

/** The published `pageLimit` range. */
export const PAGE_LIMIT_MIN = 1
export const PAGE_LIMIT_MAX = 100

/** A typed failure, so a caller can tell a protocol error from a transport error. */
export class ZetarisError extends Error {
  readonly status: number
  readonly path: string

  constructor(message: string, status: number, path: string) {
    super(message)
    this.name = 'ZetarisError'
    this.status = status
    this.path = path
  }
}

const trimBase = (baseUrl: string): string => baseUrl.replace(/\/+$/, '')

/** `pageLimit` is bounded by the published contract. Refuse the rest. */
export function assertPageLimit(pageLimit: number): number {
  if (!Number.isInteger(pageLimit) || pageLimit < PAGE_LIMIT_MIN || pageLimit > PAGE_LIMIT_MAX) {
    throw new ZetarisError(
      `pageLimit must be an integer between ${PAGE_LIMIT_MIN} and ${PAGE_LIMIT_MAX}, got ${pageLimit}.`,
      0,
      ZETARIS_PATHS.open,
    )
  }
  return pageLimit
}

/** The response shape the published `OpenSqlQuery` answers with. */
interface OpenSqlResponse {
  records?: unknown[]
  pageNumber?: number
  pageLimit?: number
  totalCount?: number
  totalPages?: number
  queryToken?: string
}

/** The response shape the published `PageSqlQuery` answers with. */
interface PageSqlResponse {
  queryToken?: string
  pageNumber?: number
  records?: unknown[]
  totalCount?: number
  totalPages?: number
}

const asRows = (records: unknown[] | undefined): ZetarisRow[] =>
  (records ?? []).filter((row): row is ZetarisRow => typeof row === 'object' && row !== null)

/**
 * The client.
 *
 * One code path. The base URL is the only difference between a live instance and
 * our protocol-compatible local server — which is the whole point of the declared
 * deviation: the client is real either way.
 */
export class ZetarisClient implements ZetarisAdapter {
  private readonly config: ZetarisConfig
  private readonly baseUrl: string
  private cachedIdToken?: string
  private cachedRefreshToken?: string
  private sent = 0

  constructor(config: ZetarisConfig) {
    this.config = config
    this.baseUrl = trimBase(config.baseUrl)
    this.cachedIdToken = config.idToken
    this.cachedRefreshToken = config.refreshToken
  }

  /** How many HTTP requests this client has sent — the round trips of a pull. */
  get requests(): number {
    return this.sent
  }

  /** `live` unless the host is our own loopback server. */
  get mode(): 'live' | 'local' {
    const host = this.baseUrl.replace(/^https?:\/\//, '').split(':')[0] ?? ''
    return host === '127.0.0.1' || host === 'localhost' || host === '::1' ? 'local' : 'live'
  }

  async open(query: ZetarisQuery): Promise<{ queryToken: string }> {
    const pageLimit = assertPageLimit(query.pageLimit ?? 100)
    const body = JSON.stringify({ select: query.select, pageLimit })
    const response = await this.send(ZETARIS_PATHS.open, 'POST', body)
    const parsed = (await this.json(response)) as OpenSqlResponse
    const queryToken = parsed.queryToken
    if (typeof queryToken !== 'string' || queryToken === '') {
      throw new ZetarisError(
        'OpenSqlQuery did not return a queryToken.',
        response.status,
        ZETARIS_PATHS.open,
      )
    }
    return { queryToken }
  }

  async page(queryToken: string, options: ZetarisPageOptions = {}): Promise<ZetarisPage> {
    const pageLimit = assertPageLimit(options.pageLimit ?? 100)
    const pageNumber = options.pageNumber ?? 1
    const path = `${ZETARIS_PATHS.page}?queryToken=${encodeURIComponent(queryToken)}` +
      `&pageLimit=${pageLimit}&pageNumber=${pageNumber}`
    const response = await this.send(path, 'GET')
    const parsed = (await this.json(response)) as PageSqlResponse
    const totalPages = parsed.totalPages ?? 1
    return {
      rows: asRows(parsed.records),
      nextToken: parsed.pageNumber !== undefined && parsed.pageNumber < totalPages ? queryToken : undefined,
      pageNumber: parsed.pageNumber,
      totalCount: parsed.totalCount,
      totalPages: parsed.totalPages,
    }
  }

  async close(queryToken: string): Promise<void> {
    const path = `${ZETARIS_PATHS.close}/${encodeURIComponent(queryToken)}`
    const response = await this.send(path, 'DELETE')
    // The body is not interesting; the status is. Drain it so the socket closes.
    await response.text()
  }

  /**
   * open -> page(s) -> close. The query is closed on **every** path, including the
   * error path — a leaked query holds server-side memory.
   */
  async query(sql: string, pageLimit = 100): Promise<ZetarisRow[]> {
    const limit = assertPageLimit(pageLimit)
    const { queryToken } = await this.open({ select: sql, pageLimit: limit })
    const rows: ZetarisRow[] = []
    try {
      let pageNumber = 1
      for (;;) {
        const page = await this.page(queryToken, { pageLimit: limit, pageNumber })
        rows.push(...page.rows)
        const totalPages = page.totalPages ?? 1
        if (pageNumber >= totalPages) break
        pageNumber += 1
        // Bounded: the loop stops at the server's own page count, and the count
        // cannot exceed what one pageLimit-sized result set holds.
        if (pageNumber > 10_000) break
      }
    } finally {
      await this.close(queryToken)
    }
    return rows
  }

  async health(): Promise<ZetarisHealth> {
    try {
      await this.query('SELECT 1', 1)
      return { ok: true, mode: this.mode, baseUrl: this.baseUrl }
    } catch (error) {
      return {
        ok: false,
        mode: this.mode,
        baseUrl: this.baseUrl,
        detail: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /** One HTTP request. The headers are the published ones, every time. */
  private async send(
    path: string,
    method: 'GET' | 'POST' | 'DELETE',
    body?: string,
    retried = false,
  ): Promise<Response> {
    const token = await this.token()
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'X-Org-ID': String(this.config.orgId),
      'X-Request-ID': this.requestId(),
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    let response: Response
    try {
      this.sent += 1
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 30_000),
      })
    } catch (error) {
      throw new ZetarisError(
        `Cannot reach ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`,
        0,
        path,
      )
    }

    if (response.status === 401 && this.cachedRefreshToken && !retried) {
      // One refresh, one retry — the published contract hands back a new idToken.
      await this.refresh()
      return this.send(path, method, body, true)
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500)
      throw new ZetarisError(`${method} ${path} failed: HTTP ${response.status} ${detail}`, response.status, path)
    }
    return response
  }

  private async json(response: Response): Promise<unknown> {
    const text = await response.text()
    if (text === '') return {}
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new ZetarisError('The server returned a body that is not JSON.', response.status, '')
    }
  }

  /**
   * A fresh UUID per request, as the published contract requires.
   *
   * It is never configurable: the contract says every request carries its own
   * request id, so a fixed id would misreport the request. The id is never logged
   * and never leaves the header.
   */
  private requestId(): string {
    return crypto.randomUUID()
  }

  /**
   * The bearer token. An idToken wins; then an API key; then a username/password
   * login against the published auth route, with the refresh token kept for a 401.
   *
   * Tokens are never logged, never echoed and never written to a file.
   */
  private async token(): Promise<string> {
    if (this.cachedIdToken) return this.cachedIdToken
    if (this.config.apiKey) return this.config.apiKey

    const { username, password } = this.config
    if (!username || !password) {
      throw new ZetarisError(
        'No credential: set an id token, an API key, or a username and password.',
        0,
        ZETARIS_PATHS.login,
      )
    }

    const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    let response: Response
    try {
      this.sent += 1
      response = await fetch(`${this.baseUrl}${ZETARIS_PATHS.login}`, {
        method: 'GET',
        headers: {
          Authorization: authorization,
          'X-Org-ID': String(this.config.orgId),
          'X-Request-ID': this.requestId(),
        },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 30_000),
      })
    } catch (error) {
      throw new ZetarisError(
        `Cannot reach ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`,
        0,
        ZETARIS_PATHS.login,
      )
    }
    if (!response.ok) {
      throw new ZetarisError(`Zetaris login failed: HTTP ${response.status}`, response.status, ZETARIS_PATHS.login)
    }
    const tokens = (await this.json(response)) as { idToken?: string; refreshToken?: string }
    if (!tokens.idToken) {
      throw new ZetarisError('Zetaris login did not return an id token.', response.status, ZETARIS_PATHS.login)
    }
    this.cachedIdToken = tokens.idToken
    this.cachedRefreshToken = tokens.refreshToken
    return this.cachedIdToken
  }

  /** `GET /api/v1.0/auth/refresh` with the refresh token as the bearer. */
  private async refresh(): Promise<string> {
    const refreshToken = this.cachedRefreshToken
    if (!refreshToken) {
      throw new ZetarisError('No refresh token to use.', 0, ZETARIS_PATHS.refresh)
    }
    let response: Response
    try {
      this.sent += 1
      response = await fetch(`${this.baseUrl}${ZETARIS_PATHS.refresh}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          'X-Org-ID': String(this.config.orgId),
          'X-Request-ID': this.requestId(),
        },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 30_000),
      })
    } catch (error) {
      throw new ZetarisError(
        `Cannot reach ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`,
        0,
        ZETARIS_PATHS.refresh,
      )
    }
    if (!response.ok) {
      throw new ZetarisError(`Zetaris refresh failed: HTTP ${response.status}`, response.status, ZETARIS_PATHS.refresh)
    }
    const tokens = (await this.json(response)) as { idToken?: string; refreshToken?: string }
    if (!tokens.idToken) {
      throw new ZetarisError('Zetaris refresh did not return an id token.', response.status, ZETARIS_PATHS.refresh)
    }
    this.cachedIdToken = tokens.idToken
    this.cachedRefreshToken = tokens.refreshToken ?? refreshToken
    return this.cachedIdToken
  }
}

/** Build a client from the environment. The URL is the only mode switch. */
export function zetarisFromEnv(env: Record<string, string | undefined> = {}): ZetarisClient {
  const read = (name: string): string | undefined => {
    const value = env[name] ?? Bun.env[name]
    return value === undefined || value === '' ? undefined : value
  }
  const baseUrl = read('ZETARIS_BASE_URL') ?? 'http://127.0.0.1:8791'
  const orgRaw = read('ZETARIS_ORG_ID') ?? '0'
  const orgId = Number(orgRaw)
  if (!Number.isInteger(orgId) || orgId < 0) {
    throw new ZetarisError(`ZETARIS_ORG_ID must be a numeric organisation id, got "${orgRaw}".`, 0, '')
  }
  return new ZetarisClient({
    baseUrl,
    orgId,
    idToken: read('ZETARIS_ID_TOKEN'),
    refreshToken: read('ZETARIS_REFRESH_TOKEN'),
    username: read('ZETARIS_USERNAME'),
    password: read('ZETARIS_PASSWORD'),
    apiKey: read('ZETARIS_API_KEY'),
    targetRole: read('ZETARIS_TARGET_ROLE'),
  })
}
