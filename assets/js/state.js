/**
 * Shared, mutable run state for a single speed test.
 *
 * A single module-level object is intentionally simple: the app is a
 * single-page tool with exactly one test running at a time, so a lightweight
 * shared store is clearer than threading state through every function.
 *
 * @module state
 */

/**
 * @typedef {Object} TestResults
 * @property {number} [ping]          Median unloaded latency (ms).
 * @property {number} [jitter]        Latency standard deviation (ms).
 * @property {number} [packetLoss]    Percentage of failed latency probes.
 * @property {number} [download]      Sustained download throughput (Mbps).
 * @property {number} [peakDownload]  Peak download throughput (Mbps).
 * @property {number} [upload]        Sustained upload throughput (Mbps).
 * @property {number} [consistency]   Download stability score (0–100).
 * @property {number} [bufferbloat]   Latency increase under load (ms).
 * @property {number} [dnsTime]       DNS resolution time (ms).
 * @property {number} [tcpTime]       TCP handshake time (ms).
 * @property {number} [tlsTime]       TLS negotiation time (ms).
 * @property {number} [ttfb]          Time to first byte (ms).
 * @property {string} [grade]         Overall letter grade.
 */

/**
 * @typedef {Object} RunState
 * @property {TestResults} results
 * @property {{ t: number, v: number }[]} latencySamples
 * @property {boolean} cancelRequested
 * @property {boolean} running
 */

/** @type {RunState} */
export const state = {
  results: {},
  latencySamples: [],
  cancelRequested: false,
  running: false,
};

/** Reset measurement state at the start of a new test run. */
export function resetState() {
  state.results = {};
  state.latencySamples = [];
  state.cancelRequested = false;
}
