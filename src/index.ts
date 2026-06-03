import { defaultGenerator, OsidGenerator } from "./generator.js";
import { decodeBase32, encodeBase32, isValidBase32 } from "./codec.js";
import { EPOCH_MICROSECONDS } from "./utils.js";
import { OsidComponents } from "./types.js";

/**
 * Generates a stateless, deterministic, 160-bit collision-free ID
 * serialized as a 32-character Crockford's Base32 string.
 */
export function osid(): string {
  return encodeBase32(defaultGenerator.generateRaw());
}

/**
 * Generates a raw 160-bit BigInt ID.
 */
osid.raw = function raw(): bigint {
  return defaultGenerator.generateRaw();
};

/**
 * Decodes a 32-character OSID string or 160-bit raw BigInt back into its components.
 */
osid.decode = function decode(id: string | bigint): OsidComponents {
  const rawVal = typeof id === "bigint" ? id : decodeBase32(id);

  if (rawVal < 0n || rawVal >= 1n << 160n) {
    throw new Error("Invalid OSID: Value exceeds 160-bit integer boundaries.");
  }

  const timestamp = rawVal >> 96n;
  const spatial = (rawVal >> 32n) & 0xFFFFFFFFFFFFFFFFn;
  const sequence = Number(rawVal & 0xFFFFFFFFn);

  const hostId = spatial >> 16n;
  const processId = Number(spatial & 0xFFFFn);

  return {
    timestamp,
    spatial: {
      hostId,
      processId,
    },
    sequence,
  };
};

/**
 * Validates whether a given string is a valid 32-character Crockford's Base32 OSID.
 */
osid.isValid = function isValid(id: any): boolean {
  return isValidBase32(id);
};

/**
 * Converts OSID components into human-readable information.
 */
osid.info = function info(id: string | bigint) {
  const decoded = osid.decode(id);
  const unixMs = Number((decoded.timestamp + EPOCH_MICROSECONDS) / 1000n);
  const date = new Date(unixMs);
  
  // Format host ID as MAC address representation
  const hostHex = decoded.spatial.hostId.toString(16).padStart(12, "0");
  const macFormatted = hostHex.match(/.{1,2}/g)?.join(":").toUpperCase() ?? hostHex;

  return {
    date: date.toISOString(),
    timestampMicroseconds: decoded.timestamp.toString(),
    hostId: decoded.spatial.hostId.toString(),
    hostMacFormatted: macFormatted,
    processId: decoded.spatial.processId,
    sequence: decoded.sequence,
  };
};

// Export class and types for external use
export { OsidGenerator };
export * from "./types.js";
