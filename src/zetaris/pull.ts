/**
 * The federated pull — where the swarm's candidate listings come from.
 *
 * Two modes, one code path:
 *
 *   live  — `ZETARIS_BASE_URL` points at a Zetaris instance. The published client
 *           talks to it over the published REST contract.
 *   local — no instance was reachable during the build, so the build runs against
 *           the protocol-compatible server in `local-server.ts`, in-process, on an
 *           ephemeral port. **The client cannot tell the difference** — it does not
 *           know the local server exists.
 *
 * If the pull fails for any reason, the run does not die: the file loader answers
 * instead and the degradation is marked in the trace and in the run status. That is
 * the same rule the rest of the swarm follows — a dependency that is down degrades
 * the decision, it does not abort the run.
 */

import type { Listing } from '../types.ts'
import { loadFlatListings, loadListings } from '../loading.ts'
import { ZetarisClient, zetarisFromEnv } from './adapter.ts'
import type { ZetarisAdapter } from './adapter.ts'
import { startZetarisLocalServer } from './local-server.ts'
import { pullListings } from './reader.ts'
import { buildTables } from './tables.ts'

export type PullMode = 'live' | 'local' | 'file'

export interface PullResult {
  listings: Listing[]
  mode: PullMode
  /** Why this mode, in one sentence. Never contains a token. */
  reason: string
  /** The instance the pull ran against, when it ran over the wire. */
  baseUrl?: string
  /** The HTTP round trips the pull made. */
  requests: number
}

/** The local server's own counters, so the caller can report the round trips. */
export interface PullOptions {
  /** Force the local server even when `ZETARIS_BASE_URL` is set. */
  forceLocal?: boolean
}

/**
 * Pull the listings. Never throws — a failure degrades to the file loader.
 */
export async function pullCandidates(options: PullOptions = {}): Promise<PullResult> {
  const configured = Bun.env.ZETARIS_BASE_URL
  const useLive = !options.forceLocal && typeof configured === 'string' && configured !== ''

  if (useLive) {
    try {
      const client = zetarisFromEnv()
      const listings = await pullListings(client)
      return {
        listings,
        mode: 'live',
        reason: `The listings were pulled over the Zetaris REST contract from ${client.mode === 'live' ? 'a live instance' : 'the configured instance'}.`,
        baseUrl: configured,
        requests: client.requests,
      }
    } catch (error) {
      return degraded(error)
    }
  }

  // Local mode: the protocol-compatible server, in-process.
  try {
    const server = startZetarisLocalServer({ tables: buildTables(loadFlatListings()) })
    try {
      const client = new ZetarisClient({
        baseUrl: server.url,
        orgId: server.orgId,
        username: server.username,
        password: server.password,
      })
      const listings = await pullListings(client)
      return {
        listings,
        mode: 'local',
        reason:
          'The listings were pulled over the published Zetaris REST contract, against the ' +
          'protocol-compatible local server (no live instance was reachable during the build).',
        baseUrl: server.url,
        requests: client.requests,
      }
    } finally {
      server.stop()
    }
  } catch (error) {
    return degraded(error)
  }
}

/** The file loader answers, and the run is marked degraded. */
function degraded(error: unknown): PullResult {
  const { listings } = loadListings()
  return {
    listings,
    mode: 'file',
    reason: `The Zetaris pull did not answer (${error instanceof Error ? error.message : String(error)}), so the file loader answered instead.`,
    requests: 0,
  }
}
