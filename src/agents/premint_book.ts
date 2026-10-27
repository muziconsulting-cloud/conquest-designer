import { IngulaIdentityEngine } from "./identity_engine";

/**
 * High Performance Frozen Space Validator
 * Instantly confirms whether a PAN sequence fits within the 1-million frozen hex pool
 */
export function verifyFrozenIdentity(panNumber: string): boolean {
  // Validate Luhn 15+1 checksum bit configuration
  if (!IngulaIdentityEngine.validatePan(panNumber)) return false;
  
  const clean = panNumber.replace(/\s+/g, '');
  // Verify standard CDU namespace routing codes
  if (!clean.startsWith("971034210")) return false;
  
  const sequentialPortion = parseInt(clean.slice(9, 16), 10);
  return sequentialPortion >= 1 && sequentialPortion <= 1000000;
}
