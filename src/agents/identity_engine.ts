/**
 * IngulaIdentityEngine - CDU Embedded Namespace ISO 7812 PAN Generator
 * Format: [9710] (Prefix) + [3421] (CDU) + [000] (Padding) + [Sequential Counter] + [Luhn Check]
 */
let globalCounter = 1;

export class IngulaIdentityEngine {
    public static calculateLuhnChecksum(partial: string): string {
        let sum = 0;
        let shouldDouble = true;

        for (let i = partial.length - 1; i >= 0; i--) {
            let digit = parseInt(partial.charAt(i), 10);
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }

        const mod = sum % 10;
        return (mod === 0 ? 0 : 10 - mod).toString();
    }

    public static validatePan(pan: string): boolean {
        const clean = pan.replace(/\s+/g, '');
        if (!clean || clean.length !== 16 || !/^\d+$/.test(clean)) return false;

        const payload = clean.slice(0, 15);
        const expectedCheck = clean.slice(15);
        return expectedCheck === this.calculateLuhnChecksum(payload);
    }

    public static mintIdentity(): { panNumber: string; masterId: string } {
        const seq = (globalCounter++ % 10000).toString().padStart(4, '0');
        
        // 15-digit payload: 9710 (Prefix) + 3421 (CDU) + 000 (Padding) + 4-digit sequence
        const payload15 = "97103421000" + seq;
        const checkDigit = this.calculateLuhnChecksum(payload15);
        
        const rawPan = payload15 + checkDigit;
        
        // Formatted with 4-per-block visual spacing: 9710 3421 000X XXXX
        const panNumber = `${rawPan.slice(0,4)} ${rawPan.slice(4,8)} ${rawPan.slice(8,12)} ${rawPan.slice(12,16)}`;
        const masterId = `CDU-RSA-${seq}`;

        return { panNumber, masterId };
    }
}
