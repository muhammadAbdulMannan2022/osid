# osid (Omniscience ID)

### The Stateless, Deterministic, 160-Bit Collision-Free ID Generator

`osid` is an ultra-fast, decentralized identity generation protocol designed to eliminate the concept of "probability" entirely. It replaces random UUIDs with a deterministic, multi-axis system that guarantees absolute mathematical uniqueness across distributed systems without requiring network communication, database checks, or central coordination.

---

## 1. Core Architecture & Bit Budget

`osid` divides a 160-bit payload into three non-overlapping coordinates spanning Time, Space, and Order:

```
+------------------------------------+------------------------------------+----------------------------------+
|             Timestamp              |           Spatial Vector           |         Atomic Sequence          |
|             (64 Bits)              |             (64 Bits)              |            (32 Bits)             |
+------------------------------------+------------------------------------+----------------------------------+
|  <-------- Chronological --------> |  <------- Decentralized -------->  |  <------- Thread Safety -------> |
|  Microseconds since Jan 1, 2026    |  48-bit Host ID + 16-bit PID       |  4.2B unique counts/microsecond  |
```

### The Mathematical Formula

$$I = (T \times 2^{96}) + (S \times 2^{32}) + O$$

Or via bitwise operators:

$$I = (T \ll 96\text{n}) \mid (S \ll 32\text{n}) \mid O$$

Where:
- **$T$ (Chronological Vector)**: A 64-bit integer tracking elapsed microseconds since the custom epoch (January 1, 2026). Lifespan of 584,542 years before overflow.
- **$S$ (Spatial Vector)**: A 64-bit coordinate segregating execution environments. Formed by a 48-bit Host ID (derived from network MAC addresses or client uuid hash) and a 16-bit Process ID (`process.pid` or tab/random context).
- **$O$ (Atomic Sequence)**: A 32-bit local counter handling microsecond-level concurrency bursts inside the execution thread.

Since no two execution environments can share the same Spatial Vector ($S$) at the exact same point in Time ($T$), and no single environment can execute two events on the same sequence step ($O$), the intersection of these sets is empty:

$$\{T_1, S_1, O_1\} \cap \{T_2, S_2, O_2\} = \emptyset \quad \forall \text{ generations}$$

---

## 2. Serialization Format

`osid` serializes the 160-bit payload into a custom Crockford's Base32 string.

- **Lexicographical Sortability**: Because the timestamp sits at the higher-order bits, sorting the IDs as strings automatically sorts them by creation time.
- **Case Insensitivity & Safety**: Uses Crockford's Alphabet (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), mapping `I`, `L`, `i`, `l` to `1`, and `O`, `o` to `0` during decoding, preventing typo errors and avoiding accidental obscene words (by excluding `U`).
- **Fixed Clean Layout**: Exactly 32 characters long. E.g., `01H7X1ZA8000003F9A00000000000004`.

---

## 3. Installation

Install the package into your project:

```bash
npm install osid
```

---

## 4. Usage Guide

`osid` supports both ES Modules (ESM) and CommonJS (CJS) out-of-the-box.

### ES Modules (ESM)

```typescript
import { osid } from "osid";

// Generate a 32-character Base32 ID
const id = osid(); 
console.log(id); // "01H7X1ZA8000003F9A00000000000004"

// Generate a raw 160-bit BigInt
const rawId = osid.raw();
console.log(rawId); // 16560940348737222830843187216654286127104n
```

### CommonJS (CJS)

```javascript
const { osid } = require("osid");

const id = osid();
console.log(id); // "01H7X1ZA8000003F9A00000000000004"
```

---

## 5. API Reference

### `osid(): string`
Generates and returns a 32-character Crockford's Base32 ID.

### `osid.raw(): bigint`
Generates and returns the raw 160-bit BigInt ID representation.

### `osid.decode(id: string | bigint): OsidComponents`
Parses any 32-character ID string or 160-bit BigInt back into its mathematical coordinates.
Returns:
```typescript
{
  timestamp: bigint; // Microseconds since epoch
  spatial: {
    hostId: bigint;   // 48-bit host fingerprint
    processId: number; // 16-bit process ID
  };
  sequence: number;   // 32-bit sequence counter
}
```

### `osid.info(id: string | bigint): object`
Extracts components and formats them into a human-readable structure, converting timestamps to ISO dates and Host IDs to MAC-address-like representations.
Returns:
```javascript
{
  date: "2026-06-03T10:47:41.000Z",
  timestampMicroseconds: "13258061000",
  hostId: "1879048192n",
  hostMacFormatted: "00:00:70:00:00:00",
  processId: 10452,
  sequence: 0
}
```

### `osid.isValid(id: string): boolean`
Validates if a string is a valid 32-character Crockford Base32 ID (i.e. correct length and only containing valid characters).

### `class OsidGenerator`
Allows creating customized generator instances. Useful for spoofing space coordinates, resetting state, or running unit tests with smaller boundaries.
```typescript
import { OsidGenerator } from "osid";

const generator = new OsidGenerator({
  hostId: 0x112233445566n, // custom 48-bit host footprint
  processId: 99            // custom 16-bit process ID
});

const customId = generator.generateRaw();
```

---

## 6. Monotonicity & Reliability

### Clock Drift Guard rails
In the event that the system clock drifts backwards (e.g. NTP synchronization adjustment), the generator maintains strict monotonicity:
1. It retains the last known timestamp.
2. It increments the `sequence` counter until the physical clock catches up.

### Overrun Lock
In the event that a process exceeds 4,294,967,296 generated IDs within a single microsecond, the execution thread encounters a deterministic spin-lock. The execution thread halts until the system clock advances by at least 1 microsecond, resetting the sequence counter to 0 and continuing safely.

---

## 7. Development & Verification

To run tests:
```bash
npm run test
```
To run tests in watch mode:
```bash
npm run test:watch
```
To build the library files:
```bash
npm run build
```

---

## License

MIT
