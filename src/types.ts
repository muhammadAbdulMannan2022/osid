export interface OsidComponents {
  /**
   * The linear time vector in microseconds since the custom epoch (Jan 1, 2026).
   */
  timestamp: bigint;
  
  /**
   * The physical spatial vector, isolating execution environments.
   */
  spatial: {
    /**
     * 48-bit host machine footprint (derived from MAC/network interface address or fallback).
     */
    hostId: bigint;
    
    /**
     * 16-bit local process identifier (process.pid or fallback).
     */
    processId: number;
  };
  
  /**
   * The local sequential order vector (thread-safe counter).
   */
  sequence: number;
}
