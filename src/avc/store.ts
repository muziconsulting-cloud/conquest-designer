/**
 * The issued-certificate store.
 *
 * Issued certificates are kept so they can be looked up by id. The store is
 * **not** the verifier's dependency: a certificate is verifiable from its own bytes
 * and the published key, with or without this store. The store exists so the venue
 * can answer "did you issue this one?" — a separate question from "is this one
 * signed correctly?".
 *
 * In-memory for the build; the lookup surface is the same a durable store would
 * have, so swapping it later does not touch the callers.
 */

import type { Avc, CertificateId } from '../types.ts'

export interface StoredCertificate {
  avc: Avc
  /** The detached signature, base64url. The same value as `avc.proof.value`. */
  signature: string
  /** The trade the certificate was issued against. */
  tradeId: string
  issuedAt: string
}

export class CertificateStore {
  private readonly byId = new Map<CertificateId, StoredCertificate>()

  /** Store an issued certificate. Re-issuing the same id is a no-op. */
  put(entry: StoredCertificate): void {
    if (this.byId.has(entry.avc.certificateId)) return
    this.byId.set(entry.avc.certificateId, entry)
  }

  get(certificateId: CertificateId): StoredCertificate | undefined {
    return this.byId.get(certificateId)
  }

  has(certificateId: CertificateId): boolean {
    return this.byId.has(certificateId)
  }

  list(): StoredCertificate[] {
    return [...this.byId.values()]
  }

  get size(): number {
    return this.byId.size
  }
}
