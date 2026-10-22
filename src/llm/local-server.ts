/**
 * A local server that speaks the Meterless wire format.
 *
 * This is the runtime's side of the contract, not a mock of our own code: it serves
 * `GET /healthz`, `GET /v1/models` and `POST /v1/chat/completions` in the OpenAI
 * format, and it is **strict** — a request that arrives without the contract's
 * headers is refused, so a test that passes proves the headers really went out.
 *
 * It exists for one reason: the hosted provider's credential has not been issued,
 * so the contract has to be provable without one. The same adapter code runs
 * unchanged against a real Meterless endpoint.
 */

export interface LocalMeterlessOptions {
  /** The bearer token the server accepts. Anything else is refused with 401. */
  token: string
  /** The port to bind. 0 lets the OS choose. */
  port?: number
  /** The routing ids the server offers. */
  models?: string[]
}

export interface RecordedRequest {
  method: string
  path: string
  authorization: string | null
  app: string | null
  scope: string | null
}

export interface LocalMeterlessServer {
  /** The base URL, normalised to `<host>/v1`. */
  url: string
  /** The host root, for `/healthz`. */
  root: string
  port: number
  /** Every request the server answered, in order. */
  log: RecordedRequest[]
  stop(): void
}

const DEFAULT_MODELS = [
  'meterless/auto',
  'meterless/deep',
  'meterless/fast',
  // A routing mode this build has never heard of. It must be kept, not filtered.
  'meterless/experimental-v2',
  // A non-Meterless id the provider may also serve.
  'gpt-4o-mini',
]

export function startLocalMeterlessServer(options: LocalMeterlessOptions): LocalMeterlessServer {
  const token = options.token
  const models = options.models ?? DEFAULT_MODELS
  const log: RecordedRequest[] = []

  const server = Bun.serve({
    port: options.port ?? 0,
    async fetch(request) {
      const url = new URL(request.url)
      const record: RecordedRequest = {
        method: request.method,
        path: url.pathname,
        authorization: request.headers.get('authorization'),
        app: request.headers.get('meterless-app'),
        scope: request.headers.get('meterless-scope'),
      }
      log.push(record)

      // Liveness. No token, and it proves nothing about the model — only that the
      // process is up.
      if (url.pathname === '/healthz') {
        return Response.json({ status: 'ok', service: 'meterless-runtime' })
      }

      if (url.pathname === '/v1/models') {
        if (record.authorization !== `Bearer ${token}`) {
          return Response.json({ error: 'invalid token' }, { status: 401 })
        }
        if (!record.app) {
          return Response.json({ error: 'meterless-app is required' }, { status: 400 })
        }
        return Response.json({
          object: 'list',
          data: models.map((id) => ({ id, object: 'model', owned_by: 'meterless' })),
        })
      }

      if (url.pathname === '/v1/chat/completions' && request.method === 'POST') {
        if (record.authorization !== `Bearer ${token}`) {
          return Response.json({ error: 'invalid token' }, { status: 401 })
        }
        if (!record.app) {
          return Response.json({ error: 'meterless-app is required' }, { status: 400 })
        }
        if (record.scope !== 'user') {
          return Response.json({ error: 'meterless-scope: user is required on chat' }, { status: 400 })
        }
        const body = (await request.json()) as { model?: string; messages?: unknown[] }
        const model = body.model ?? models[0] ?? 'meterless/auto'
        const count = Array.isArray(body.messages) ? body.messages.length : 0
        return Response.json({
          id: `chatcmpl-local-${count}`,
          object: 'chat.completion',
          model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                // Plain prose, on purpose: the adapter must keep it a string.
                content: `Meterless Runtime (local) received ${count} message(s) and answered in plain text. Routing mode: ${model}.`,
              },
              finish_reason: 'stop',
            },
          ],
        })
      }

      return Response.json({ error: 'not found' }, { status: 404 })
    },
  })

  const root = `http://127.0.0.1:${server.port ?? 0}`

  return {
    url: `${root}/v1`,
    root,
    port: server.port ?? 0,
    log,
    stop() {
      server.stop(true)
    },
  }
}
