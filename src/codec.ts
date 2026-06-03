const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const CHAR_TO_VAL: { [key: string]: bigint } = {};
for (let i = 0; i < ALPHABET.length; i++) {
  CHAR_TO_VAL[ALPHABET[i]] = BigInt(i);
}

// Crockford's standard normalization rules
CHAR_TO_VAL["I"] = 1n;
CHAR_TO_VAL["L"] = 1n;
CHAR_TO_VAL["O"] = 0n;

/**
 * Encodes a 160-bit BigInt ID into a 32-character Crockford's Base32 string.
 * High-order bits are placed first (leftmost) to ensure lexicographical sortability.
 */
export function encodeBase32(id: bigint): string {
  if (id < 0n || id >= 1n << 160n) {
    throw new Error("ID value is out of bounds for a 160-bit integer.");
  }

  let result = "";
  for (let i = 31; i >= 0; i--) {
    const shift = BigInt(i * 5);
    const val = Number((id >> shift) & 0x1Fn);
    result += ALPHABET[val];
  }
  return result;
}

/**
 * Decodes a 32-character Crockford's Base32 string back into a 160-bit BigInt ID.
 * Performs Crockford's letter correction (I/L/i/l -> 1, O/o -> 0) and case-insensitivity.
 */
export function decodeBase32(str: string): bigint {
  if (typeof str !== "string" || str.length !== 32) {
    throw new Error("Invalid OSID length. Must be exactly 32 characters.");
  }

  let id = 0n;
  for (let i = 0; i < 32; i++) {
    const char = str[i].toUpperCase();
    const val = CHAR_TO_VAL[char];
    if (val === undefined) {
      throw new Error(`Invalid Crockford Base32 character at index ${i}: "${str[i]}"`);
    }
    id = (id << 5n) | val;
  }
  return id;
}

/**
 * Validates if the given string represents a valid 32-character Crockford's Base32 ID.
 */
export function isValidBase32(str: any): boolean {
  if (typeof str !== "string" || str.length !== 32) {
    return false;
  }

  for (let i = 0; i < 32; i++) {
    const char = str[i].toUpperCase();
    if (CHAR_TO_VAL[char] === undefined) {
      return false;
    }
  }

  return true;
}
