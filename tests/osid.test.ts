import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { osid, OsidGenerator } from "../src/index.js";
import * as utils from "../src/utils.js";

describe("Omniscience ID (osid) Package Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Basic Generation and Validation", () => {
    test("should generate a 32-character string ID", () => {
      const id = osid();
      expect(typeof id).toBe("string");
      expect(id.length).toBe(32);
    });

    test("should generate valid Crockford Base32 ID format", () => {
      const id = osid();
      expect(osid.isValid(id)).toBe(true);
    });

    test("should reject invalid IDs", () => {
      expect(osid.isValid("not-a-valid-id")).toBe(false);
      expect(osid.isValid("01H7X1ZA8000003F9A0000000000000U")).toBe(false); // Contains U
      expect(osid.isValid("01H7X1ZA8000003F9A00000000000004")).toBe(true);
    });
  });

  describe("Crockford's Normalization and Case-Insensitivity", () => {
    test("should decode correctly ignoring casing and mapping letters", () => {
      // Decode a known ID
      const standard = "01H7X1ZA8000003F9A00000000000004";
      const uppercase = standard.toUpperCase();
      const lowercase = standard.toLowerCase();
      
      // Replace some chars with I/L/O/i/l/o
      // Index 1 (1) -> I
      // Index 2 (H) -> h
      // Index 13 (0) -> O
      const modified = "0IH7X1ZA80000O3F9A00000000000004";
      
      const rawStandard = osid.decode(standard);
      const rawUppercase = osid.decode(uppercase);
      const rawLowercase = osid.decode(lowercase);
      const rawModified = osid.decode(modified);

      expect(rawUppercase).toEqual(rawStandard);
      expect(rawLowercase).toEqual(rawStandard);
      expect(rawModified).toEqual(rawStandard);
    });
  });

  describe("Decoding & Bit Breakdown Correctness", () => {
    test("should encode and decode components accurately", () => {
      const hostId = 0xabcdef123456n;
      const processId = 4567;
      const customGenerator = new OsidGenerator({ hostId, processId });

      const raw = customGenerator.generateRaw();
      const encoded = osid.decode(raw);

      expect(encoded.spatial.hostId).toBe(hostId);
      expect(encoded.spatial.processId).toBe(processId);
      expect(encoded.sequence).toBe(0); // First ID in this microsecond
    });

    test("should return info matching raw data", () => {
      const id = osid();
      const info = osid.info(id);

      expect(info.sequence).toBe(0);
      expect(typeof info.date).toBe("string");
      expect(info.hostMacFormatted).toMatch(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/);
    });
  });

  describe("Chronological Sortability", () => {
    test("should preserve ordering chronologically", () => {
      const ids: string[] = [];
      
      // Stub high-precision clock
      let mockTime = 1000n;
      vi.spyOn(utils, "getCurrentMicroseconds").mockImplementation(() => mockTime);

      for (let i = 0; i < 5; i++) {
        ids.push(osid());
        mockTime += 10n; // Advance clock by 10 microseconds
      }

      // Sort strings lexicographically
      const sortedIds = [...ids].sort();

      expect(ids).toEqual(sortedIds);
    });
  });

  describe("Collision-Freedom", () => {
    test("should generate no collisions in high-velocity burst", () => {
      const generated = new Set<string>();
      const iterations = 50000;
      
      for (let i = 0; i < iterations; i++) {
        const id = osid();
        expect(generated.has(id)).toBe(false);
        generated.add(id);
      }
    });
  });

  describe("Clock Rollback / Monotonicity Guardrails", () => {
    test("should handle backward clock drift without creating duplicates", () => {
      const hostId = 0x112233445566n;
      const processId = 99;
      const customGenerator = new OsidGenerator({ hostId, processId });

      let mockTime = 5000n;
      const clockSpy = vi.spyOn(utils, "getCurrentMicroseconds").mockImplementation(() => mockTime);

      const id1 = customGenerator.generateRaw();
      
      // Clock rolls backward
      mockTime = 4900n;

      const id2 = customGenerator.generateRaw();

      const decoded1 = osid.decode(id1);
      const decoded2 = osid.decode(id2);

      // Even though clock went back to 4900, generator should treat it as 5000 and increment sequence
      expect(decoded1.timestamp).toBe(5000n);
      expect(decoded1.sequence).toBe(0);

      expect(decoded2.timestamp).toBe(5000n);
      expect(decoded2.sequence).toBe(1);
      
      expect(id1).not.toBe(id2);
    });
  });

  describe("Overrun Lock (Spin Lock)", () => {
    test("should block and advance clock on counter overflow", () => {
      // Create a generator with maxSequence = 2 (allows 0, 1, 2 = 3 IDs per microsecond max)
      const hostId = 0xaabbccddeeffn;
      const processId = 123;
      const customGenerator = new OsidGenerator({
        hostId,
        processId,
        maxSequence: 2,
      });

      let mockTime = 1000n;
      
      // Mock the clock behavior:
      // First 3 calls (0, 1, 2) return 1000n.
      // During spin-wait, the clock will eventually return 1001n.
      vi.spyOn(utils, "getCurrentMicroseconds").mockImplementation(() => {
        return mockTime;
      });

      // ID 0 (seq 0) at 1000n
      const id0 = customGenerator.generateRaw();
      expect(osid.decode(id0).timestamp).toBe(1000n);
      expect(osid.decode(id0).sequence).toBe(0);

      // ID 1 (seq 1) at 1000n
      const id1 = customGenerator.generateRaw();
      expect(osid.decode(id1).timestamp).toBe(1000n);
      expect(osid.decode(id1).sequence).toBe(1);

      // ID 2 (seq 2) at 1000n
      const id2 = customGenerator.generateRaw();
      expect(osid.decode(id2).timestamp).toBe(1000n);
      expect(osid.decode(id2).sequence).toBe(2);

      // ID 3 (seq 3 -> overflows maxSequence = 2).
      // This will trigger the spin loop. Inside the loop, it polls getCurrentMicroseconds().
      // Let's schedule mockTime to increment to 1001n after a brief moment.
      // Since Javascript runs in a single thread, and we are mocking the clock, we must simulate the advancement:
      // We can make the clock return 1001n on the next call inside the spin loop.
      let calls = 0;
      vi.restoreAllMocks();
      vi.spyOn(utils, "getCurrentMicroseconds").mockImplementation(() => {
        calls++;
        if (calls > 2) {
          mockTime = 1001n;
        }
        return mockTime;
      });

      // This call should successfully complete once mockTime becomes 1001n, resetting sequence to 0
      const id3 = customGenerator.generateRaw();
      expect(osid.decode(id3).timestamp).toBe(1001n);
      expect(osid.decode(id3).sequence).toBe(0);
    });
  });
});
