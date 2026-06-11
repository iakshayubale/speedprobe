/**
 * Pure utility helpers: math, formatting and a small compatibility shim.
 *
 * Nothing in this module touches the DOM or application state, so every
 * function here is trivially unit-testable.
 *
 * @module utils
 */

/**
 * Install a polyfill for `AbortSignal.timeout` on browsers that lack it
 * (notably Safari < 16). Safe to call multiple times.
 */
export function installAbortSignalTimeout() {
  if (typeof AbortSignal.timeout === 'function') return;
  AbortSignal.timeout = (ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
    return controller.signal;
  };
}

/**
 * Resolve after the given delay.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Median of a numeric array. Returns 0 for an empty array.
 * @param {number[]} values
 * @returns {number}
 */
export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Population standard deviation. Returns 0 for an empty array.
 * @param {number[]} values
 * @returns {number}
 */
export function standardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Arithmetic mean. Returns 0 for an empty array.
 * @param {number[]} values
 * @returns {number}
 */
export function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Clamp a number to the inclusive range [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Convert a byte count transferred over a duration into megabits per second.
 * @param {number} bytes
 * @param {number} seconds
 * @returns {number}
 */
export const toMbps = (bytes, seconds) => (bytes * 8) / (seconds * 1e6);

/**
 * Format a throughput value (one decimal below 10, whole numbers above).
 * @param {number} value
 * @returns {string}
 */
export const formatSpeed = (value) => (value < 10 ? value.toFixed(1) : value.toFixed(0));

/**
 * Format a millisecond value (one decimal below 10, whole numbers above).
 * @param {number} value
 * @returns {string}
 */
export const formatMs = (value) => (value < 10 ? value.toFixed(1) : value.toFixed(0));

/**
 * Human-friendly relative time for the history table.
 * @param {number} timestamp - epoch milliseconds
 * @returns {string}
 */
export function formatTimeAgo(timestamp) {
  const delta = Date.now() - timestamp;
  if (delta < 60_000) return 'Just now';
  if (delta < 3_600_000) return `${(delta / 60_000) | 0}m ago`;
  if (delta < 86_400_000) return `${(delta / 3_600_000) | 0}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
