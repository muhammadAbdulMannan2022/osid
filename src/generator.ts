import { getCurrentMicroseconds, getHostId, getProcessId } from "./utils.js";

export class OsidGenerator {
  private lastTimestamp = 0n;
  private sequence = 0;
  private readonly spatialVector: bigint;
  private readonly maxSequence: number;

  constructor(options?: { hostId?: bigint; processId?: number; maxSequence?: number }) {
    const host = options?.hostId ?? getHostId();
    const pid = options?.processId ?? getProcessId();
    this.maxSequence = options?.maxSequence ?? 0xFFFFFFFF;

    // S (64 bits) = (Host ID (48 bits) << 16) | Process ID (16 bits)
    this.spatialVector =
      ((host & 0xFFFFFFFFFFFFn) << 16n) | BigInt(pid & 0xFFFF);
  }

  /**
   * Gets the configured 64-bit spatial vector.
   */
  public getSpatialVector(): bigint {
    return this.spatialVector;
  }

  /**
   * Generates a raw 160-bit BigInt ID.
   * Enforces strict monotonicity and overrun locking.
   */
  public generateRaw(): bigint {
    let T = getCurrentMicroseconds();

    if (T < 0n) {
      throw new Error(
        "System clock is set before the custom epoch (January 1, 2026)."
      );
    }

    if (T < this.lastTimestamp) {
      // Clock rollback safety: treat as the same microsecond and increment sequence
      T = this.lastTimestamp;
    }

    if (T === this.lastTimestamp) {
      this.sequence++;
      if (this.sequence > this.maxSequence) {
        // Overrun lock: spin-wait until the clock advances
        while (true) {
          const nextT = getCurrentMicroseconds();
          if (nextT > this.lastTimestamp) {
            T = nextT;
            this.sequence = 0;
            break;
          }
        }
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = T;

    // Concatenate bits: T (64 bits) | S (64 bits) | O (32 bits)
    return (T << 96n) | (this.spatialVector << 32n) | BigInt(this.sequence);
  }
}

// Default generator instance
export const defaultGenerator = new OsidGenerator();
