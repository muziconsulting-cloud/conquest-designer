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
 * The published contract (reference: `kbase.zetaris.com/knowledge/rest-api`;
 * Postman collection: `github.com/zetaris/zetaris-public`):
 *
 *   OpenSqlQuery   POST { "select": "SELECT * FROM ...", "pageLimit": N }   (1..100)
 *   PageSqlQuery   POST carrying the returned `queryToken`
 *   CloseSqlQuery  POST carrying the `queryToken` — releases server-side memory
 *
 * Auth is `Authorization: Bearer <idToken>` (login returns an idToken plus a
 * refreshToken). Every request carries `X-Org-ID: <numeric org id>` and
 * `X-Request-ID: <uuid>`.
 *
 * INTERFACE ONLY — the implementation is build-window work (prompt P6).
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
  /** UUID per request. Sent as `X-Request-ID`. */
  requestId?: string
  /** Optional role the query is executed as. */
  targetRole?: string
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
}

export interface ZetarisAdapter {
  /** OpenSqlQuery. */
  open(query: ZetarisQuery): Promise<{ queryToken: string }>
  /** PageSqlQuery. */
  page(queryToken: string): Promise<ZetarisPage>
  /** CloseSqlQuery. Always called, so the server releases the query. */
  close(queryToken: string): Promise<void>
  /**
   * Convenience: open -> page(s) -> close, in a `finally` so the query is never
   * leaked. This is the call the swarm actually makes.
   */
  query(sql: string, pageLimit?: number): Promise<ZetarisRow[]>
}
