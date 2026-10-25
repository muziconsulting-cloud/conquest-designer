/**
 * CDHQ Agent Verification - W3C VC Issuer (did:web)
 */
import { readEnv } from '../avc/sign.ts'
import { canonicalizePayload } from '../avc/canonical.ts'
import { contentHash } from '../avc/canonical.ts'

const encoder = new TextEncoder()
type JsonWebKeyLike = Record<string, unknown>

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const buffer = Buffer.from(padded, 'base64')
  const out = new Uint8Array(new ArrayBuffer(buffer.byteLength))
  out.set(buffer)
  return out
}

const toBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function importPrivateKey(raw: string): Promise<CryptoKey> {
  if (raw.trimStart().startsWith('{')) {
    return crypto.subtle.importKey('jwk', JSON.parse(raw) as JsonWebKeyLike, { name: 'Ed25519' }, false, ['sign'])
  }
  const bytes = fromBase64Url(raw)
  if (bytes.byteLength === 32) {
    return crypto.subtle.importKey('raw', bytes, { name: 'Ed25519' }, false, ['sign'])
  }
  return crypto.subtle.importKey('pkcs8', bytes, { name: 'Ed25519' }, false, ['sign'])
}

export const ISSUER_DID = 'did:web:conquestdesigner.com'

export function getIssuerKeyId(): string {
  const key = readEnv('AVC_PUBLIC_KEY') || readEnv('CDHQ_PUBLIC_KEY')
  if (!key) throw new Error('CDHQ/AVC public key not configured')
  return `cdhq-${contentHash(key).slice(0, 12)}`
}

export function getDIDDocument() {
  const key = readEnv('AVC_PUBLIC_KEY') || readEnv('CDHQ_PUBLIC_KEY')
  if (!key) throw new Error('CDHQ/AVC public key not configured')
  return {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/ed25519-2020/v1'],
    id: ISSUER_DID,
    verificationMethod: [{
      id: `${ISSUER_DID}#${getIssuerKeyId()}`,
      type: 'Ed25519VerificationKey2020',
      controller: ISSUER_DID,
      publicKeyBase64: key,
    }],
    authentication: [`${ISSUER_DID}#${getIssuerKeyId()}`],
    assertionMethod: [`${ISSUER_DID}#${getIssuerKeyId()}`],
  }
}

export function getCDHQJwks() {
  const key = readEnv('AVC_PUBLIC_KEY') || readEnv('CDHQ_PUBLIC_KEY')
  if (!key) throw new Error('CDHQ/AVC public key not configured')
  return {
    keys: [{
      kty: 'OKP',
      crv: 'Ed25519',
      alg: 'EdDSA',
      use: 'sig',
      kid: getIssuerKeyId(),
      x: key,
    }]
  }
}

export interface CDHQVCSubject {
  id?: string
  agentId: string
  endpoint?: string
  skills?: any[]
  score: number
  thresholdMet: boolean
  evaluatedAt: string
  evaluator: string
  indexRef: string
  declaredPrice?: string
  pan16?: string
}

export async function issueCDHQCredential(subject: CDHQVCSubject): Promise<any> {
  const privateKey = readEnv('AVC_PRIVATE_KEY') || readEnv('CDHQ_PRIVATE_KEY')
  if (!privateKey) throw new Error('CDHQ signing key not configured')
  
  const now = new Date().toISOString()
  const credId = `urn:uuid:${crypto.randomUUID()}`
  
  const credential: any = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1'
    ],
    id: credId,
    type: ['VerifiableCredential', 'CDHQAgentVerification'],
    issuer: ISSUER_DID,
    issuanceDate: now,
    credentialSubject: subject,
  }
  
  const key = await importPrivateKey(privateKey)
  const payload = canonicalizePayload(credential)
  const signature = await crypto.subtle.sign('Ed25519', key, encoder.encode(payload))
  const sigB64 = toBase64Url(new Uint8Array(signature))
  
  credential.proof = {
    type: 'Ed25519Signature2020',
    created: now,
    proofPurpose: 'assertionMethod',
    verificationMethod: `${ISSUER_DID}#${getIssuerKeyId()}`,
    proofValue: sigB64
  }
  
  return credential
}
