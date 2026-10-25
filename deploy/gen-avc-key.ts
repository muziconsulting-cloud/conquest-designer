/**
 * Generate the venue's AVC signing keypair — **on the box, into `.env`, and nowhere else.**
 *
 * The certificate's signing key comes from the environment and has no default (see
 * `src/avc/sign.ts`). This script is the one way to mint a pair for a deployment:
 *
 *   bun run deploy/gen-avc-key.ts            # writes ./.env (0600), refuses to overwrite
 *   bun run deploy/gen-avc-key.ts --force     # rotates in place
 *
 * It prints the public key id and nothing else. The private key is written to a
 * 0600 file and never echoed, logged or committed.
 */

import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const force = process.argv.includes('--force')
const envPath = join(process.cwd(), '.env')

if (existsSync(envPath) && !force) {
  console.error('.env already exists. Pass --force to replace it.')
  process.exit(1)
}

const b64u = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
const rawPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))

/** Keep anything the operator already set; replace only the two key lines. */
const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : []
const kept = existing.filter(
  (line) => line.trim() !== '' && !line.startsWith('AVC_PRIVATE_KEY=') && !line.startsWith('AVC_PUBLIC_KEY='),
)
if (kept.length === 0) kept.push('SAMPLE_MODE=true')

const out = [
  ...kept,
  `AVC_PRIVATE_KEY=${b64u(pkcs8)}`,
  `AVC_PUBLIC_KEY=${b64u(rawPublic)}`,
  '',
].join('\n')

writeFileSync(envPath, out, { mode: 0o600 })
chmodSync(envPath, 0o600)

const publicKey = b64u(rawPublic)
const keyId = `avc-${new Bun.CryptoHasher('sha256').update(publicKey).digest('hex').slice(0, 12)}`
console.log(`wrote ${envPath} (0600) — key id ${keyId}`)
