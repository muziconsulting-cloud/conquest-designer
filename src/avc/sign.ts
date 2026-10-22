/**
 * Sign and verify the certificate payload.
 *
 * Ed25519 through Bun's WebCrypto. The key material comes from the environment
 * (`Bun.env`) and only from the environment:
 *
 *   AVC_PRIVATE_KEY — base64url raw 32-byte seed, base64url PKCS#8, or a JWK JSON.
 *   AVC_PUBLIC_KEY  — base64url raw 32-byte public key.
 *
 * There is **no default key** in this file, and there never will be: a missing key
 * is a loud failure, not a silent fallback. Keys are never logged, never returned
 * and never written to disk.
 */

import { canonicalizePayload, contentHash } from './canonical.ts'
import type { AvcPayload } from './canonical.ts'

const encoder = new TextEncoder()

/** A JWK, without depending on a lib type that is not always present. */
type JsonWebKeyLike = Parameters<typeof crypto.subtle.importKey>[1] extends never ? never : Record<string, unknown>

interface Jwk {
  kty: string
  crv?: string
  d?: string
  x?: string
  [key: string]: unknown
}

/** Read a variable from the environment. Never from a file, never a default. */
export function readEnv(name: string): string | undefined {
  const bun = (globalThis as { Bun?: { env?: Record<string, string | undefined> } }).Bun
  const value = bun?.env?.[name] ?? process.env[name]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const buffer = Buffer.from(padded, 'base64')
  const out = new Uint8Array(new ArrayBuffer(buffer.byteLength))
  out.set(buffer)
  return out
}

const toBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** Import an Ed25519 private key from the three shapes we accept. */
async function importPrivateKey(raw: string): Promise<CryptoKey> {
  if (raw.trimStart().startsWith('{')) {
    return crypto.subtle.importKey(
      'jwk',
      JSON.parse(raw) as Jwk as unknown as JsonWebKeyLike,
      { name: 'Ed25519' },
      false,
      ['sign'],
    )
  }
  const bytes = fromBase64Url(raw)
  if (bytes.byteLength === 32) {
    return crypto.subtle.importKey('raw', bytes, { name: 'Ed25519' }, false, ['sign'])
  }
  return crypto.subtle.importKey('pkcs8', bytes, { name: 'Ed25519' }, false, ['sign'])
}

/** Import an Ed25519 public key from the three shapes we accept. */
async function importPublicKey(raw: string): Promise<CryptoKey> {
  if (raw.trimStart().startsWith('{')) {
    return crypto.subtle.importKey(
      'jwk',
      JSON.parse(raw) as Jwk as unknown as JsonWebKeyLike,
      { name: 'Ed25519' },
      true,
      ['verify'],
    )
  }
  const bytes = fromBase64Url(raw)
  if (bytes.byteLength === 32) {
    return crypto.subtle.importKey('raw', bytes, { name: 'Ed25519' }, true, ['verify'])
  }
  return crypto.subtle.importKey('spki', bytes, { name: 'Ed25519' }, true, ['verify'])
}

/** The signing key id — derived from the public key, so it is stable and public. */
export function keyId(publicKey: string): string {
  return `avc-${contentHash(publicKey).slice(0, 12)}`
}

/** Sign the payload. Returns a detached, base64url signature. */
export async function signPayload(payload: AvcPayload): Promise<string> {
  const privateKey = readEnv('AVC_PRIVATE_KEY')
  if (!privateKey) {
    throw new Error('AVC_PRIVATE_KEY is not set. The signing key comes from the environment, never a default.')
  }
  const key = await importPrivateKey(privateKey)
  const signature = await crypto.subtle.sign('Ed25519', key, encoder.encode(canonicalizePayload(payload)))
  return toBase64Url(new Uint8Array(signature))
}

/**
 * Verify a detached signature over the payload.
 *
 * This is the whole verification story: a public key, the canonical bytes and the
 * signature. No issuer, no store, no network.
 */
export async function verifySignature(
  payload: AvcPayload,
  signature: string,
  publicKey: string,
): Promise<boolean> {
  try {
    const key = await importPublicKey(publicKey)
    const bytes = fromBase64Url(signature)
    return await crypto.subtle.verify(
      'Ed25519',
      key,
      bytes,
      encoder.encode(canonicalizePayload(payload)),
    )
  } catch {
    return false
  }
}

/** The public key, as published in the JWKS document. */
export function readPublicKey(): string {
  const key = readEnv('AVC_PUBLIC_KEY')
  if (!key) {
    throw new Error('AVC_PUBLIC_KEY is not set. The verification key comes from the environment.')
  }
  return key
}

/** The JWKS document a third party fetches to verify a certificate offline. */
export function jwksDocument(): { keys: Array<Record<string, string>> } {
  const key = readPublicKey()
  return {
    keys: [
      {
        kty: 'OKP',
        crv: 'Ed25519',
        alg: 'EdDSA',
        use: 'sig',
        kid: keyId(key),
        x: key,
      },
    ],
  }
}
