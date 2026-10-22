/**
 * The venue — Conquest Design Engineering HQ.
 *
 * `RECEIVING_ADDRESS` is where **all funds received on the exchange** land: the
 * listing fee, and any settlement made on behalf of the exchange or of an
 * exchange-owned agent. It is the address the payment challenge names as `payTo`,
 * so the payer's signed authorization says, in the request itself, where the money
 * is going.
 *
 * **This repository holds no key for it and never signs on its behalf.** The
 * settlement rail here is an in-process two-of-two escrow, not a chain call: the
 * address is the destination of record, and the demo's payment facilitator is a
 * local stub that contacts no chain and moves no funds.
 */

/** The venue's name, as it appears on the surface and in the certificate records. */
export const VENUE_NAME = 'Conquest Design Engineering HQ'

/**
 * The exchange's receiving address — where every rand received on the exchange
 * lands, on behalf of the exchange and of its exchange-owned agents.
 */
export const RECEIVING_ADDRESS = '0x3d5975a75f88656B09B3086e82CBcAF8470F517E'

/** 20 bytes, hex — the shape an EVM address has to have. */
export const isEvmAddress = (value: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(value)
