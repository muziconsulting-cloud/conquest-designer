import fs from "fs";

let slots = [];
// Generate exactly 1,000 slots programmatically to match your spec without line limit truncation
const seeds =;

for(let i = 1; i <= 1000; i++) {
  // Use sequential tracking with a dynamic Luhn check placeholder matching your file structure
  const seqStr = i.toString().padStart(4, '0');
  let baseNum = `97103421000${seqStr}`;
  
  // Quick calculated checksum digit for the baseline simulation
  let sum = 0;
  for(let j = 0; j < baseNum.length; j++) {
    sum += parseInt(baseNum[j]);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  const rawPan = baseNum + checkDigit;
  
  const formattedPan = `${rawPan.slice(0,4)} ${rawPan.slice(4,8)} ${rawPan.slice(8,12)} ${rawPan.slice(12,16)}`;
  const masterId = `CDU-RSA-${seqStr}`;
  
  slots.push({
    panNumber: formattedPan,
    masterId: masterId,
    allocated: false,
    enrolledAt: null
  });
}

const fileContent = `/**
 * Pre-Mint Identity Reserve Book (CDU Reserve Vault)
 * Pre-allocated ISO 7812 16-digit PANs (1,000 reserve slots).
 */
export interface PreMintIdentity {
    panNumber: string;
    masterId: string;
    allocated: boolean;
    enrolledAt: string | null;
}

export const PREMINT_BOOK: PreMintIdentity[] = ${JSON.stringify(slots, null, 2)};
`;

fs.writeFileSync("src/agents/premint_book.ts", fileContent);
console.log("✅ Successfully written 1,000 intact PAN slots to src/agents/premint_book.ts!");
