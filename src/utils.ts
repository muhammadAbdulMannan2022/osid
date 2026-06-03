// Custom epoch: January 1, 2026 00:00:00 UTC
export const EPOCH_MICROSECONDS = 1767225600000000n;

/**
 * Gets the current system clock time in microseconds since January 1, 2026.
 * Uses high-precision performance markers where available.
 */
export function getCurrentMicroseconds(): bigint {
  if (
    typeof performance !== "undefined" &&
    performance.timeOrigin &&
    performance.now
  ) {
    const timeMs = performance.timeOrigin + performance.now();
    const current = BigInt(Math.floor(timeMs * 1000));
    return current - EPOCH_MICROSECONDS;
  }
  // Fallback for older runtimes
  return BigInt(Date.now()) * 1000n - EPOCH_MICROSECONDS;
}

let cachedHostId: bigint | null = null;

/**
 * Resolves a 48-bit Host Identifier.
 * Node.js: Derived from the first non-internal network interface MAC address.
 * Browser: Derived from a persistent random value stored in localStorage.
 * Fallback: Ephemeral random value.
 */
export function getHostId(): bigint {
  if (cachedHostId !== null) return cachedHostId;

  // Check if we are running in Node.js
  if (
    typeof process !== "undefined" &&
    process.release &&
    process.release.name === "node"
  ) {
    try {
      // Prevent bundlers from statically analyzing and complaining about 'os' import in browsers
      const nodeRequire =
        typeof require !== "undefined"
          ? require
          : typeof eval !== "undefined"
          ? eval("require")
          : null;
      if (nodeRequire) {
        const os = nodeRequire("os");
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          const netInterface = interfaces[name];
          if (!netInterface) continue;
          for (const eth of netInterface) {
            if (!eth.internal && eth.mac && eth.mac !== "00:00:00:00:00:00") {
              const hex = eth.mac.replace(/:/g, "");
              cachedHostId = BigInt("0x" + hex) & 0xFFFFFFFFFFFFn;
              return cachedHostId;
            }
          }
        }
      }
    } catch (e) {
      // Fall through to fallback on any require/os failure
    }
  }

  // Browser-specific persistence check
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    try {
      const stored = window.localStorage.getItem("__osid_host_id");
      if (stored) {
        cachedHostId = BigInt(stored) & 0xFFFFFFFFFFFFn;
        return cachedHostId;
      }
    } catch (e) {
      // Storage access blocked or disallowed
    }
  }

  // Fallback: Generate a cryptographically secure random 48-bit value
  const randomBytes = new Uint8Array(6);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 6; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let hex = "";
  for (let i = 0; i < 6; i++) {
    hex += randomBytes[i].toString(16).padStart(2, "0");
  }
  const generated = BigInt("0x" + hex) & 0xFFFFFFFFFFFFn;

  // Persist browser-side if possible
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    try {
      window.localStorage.setItem("__osid_host_id", generated.toString());
    } catch (e) {
      // Ignore write errors
    }
  }

  cachedHostId = generated;
  return cachedHostId;
}

let cachedPid: number | null = null;

/**
 * Resolves a 16-bit Process Identifier.
 * Node.js: Derived from process.pid.
 * Browser: Derived from an ephemeral random number generated per load.
 */
export function getProcessId(): number {
  if (cachedPid !== null) return cachedPid;

  if (typeof process !== "undefined" && process.pid) {
    cachedPid = process.pid & 0xFFFF;
    return cachedPid;
  }

  // Browser/worker environment: generate random 16-bit number
  cachedPid = Math.floor(Math.random() * 65536);
  return cachedPid;
}
