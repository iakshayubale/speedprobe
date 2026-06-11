/**
 * Application configuration.
 *
 * All tunable constants live here so behaviour can be adjusted in one place
 * without touching the measurement or rendering logic.
 *
 * @module config
 */

/**
 * Cloudflare speed-test endpoints. These are public, CORS-enabled endpoints
 * used purely for client-side throughput measurement.
 *
 * `__down` streams an arbitrary number of bytes; `__up` accepts a POST body.
 */
export const ENDPOINTS = Object.freeze({
  download: 'https://speed.cloudflare.com/__down',
  upload: 'https://speed.cloudflare.com/__up',
});

/** Measurement parameters (sizes in bytes, durations in milliseconds). */
export const TEST = Object.freeze({
  /** Number of unloaded latency probes used for ping + jitter. */
  latencyProbes: 12,
  /** Pause between latency probes. */
  latencyGapMs: 80,
  /** Per-probe latency timeout. */
  latencyTimeoutMs: 4000,

  /** Payload size requested for the download stage. */
  downloadBytes: 50 * 1024 * 1024,
  /** Overall download timeout. */
  downloadTimeoutMs: 40000,
  /** Cadence of "under load" latency probes that detect bufferbloat. */
  bufferbloatProbeMs: 400,

  /** Size of each sequential upload chunk. */
  uploadChunkBytes: 2 * 1024 * 1024,
  /** Number of upload chunks (total ≈ chunks × chunkBytes). */
  uploadChunks: 6,
  /** Per-chunk upload timeout. */
  uploadTimeoutMs: 15000,

  /** Minimum elapsed seconds before a sample is counted (warm-up guard). */
  minSampleSeconds: 0.3,
});

/**
 * Visual palette shared between CSS and the canvas renderers.
 *
 * Keep these in sync with the CSS custom properties in `styles.css`. The
 * canvas APIs cannot read CSS variables cheaply per frame, so the colours are
 * mirrored here for the gauge, graph and particle field.
 */
export const COLORS = Object.freeze({
  ice: '#a5f3fc',
  crystal: '#38bdf8',
  deep: '#2563eb',
  aurora: '#818cf8',
  emerald: '#34d399',
  amber: '#fbbf24',
  orange: '#fb923c',
  rose: '#fb7185',
  track: 'rgba(120,170,255,0.08)',
  tickMajor: 'rgba(165,243,252,0.32)',
  tickMinor: 'rgba(120,170,255,0.14)',
  label: 'rgba(165,243,252,0.30)',
});

/** localStorage key under which the test history is persisted. */
export const STORAGE_KEY = 'speedprobe_history';

/** Maximum number of history entries retained. */
export const HISTORY_LIMIT = 50;

/**
 * Cloudflare's own network-info endpoint.
 * Returns plain-text key=value pairs including the client IP and country code.
 * No third-party service; no data leaves Cloudflare's infrastructure.
 * @see https://cloudflare.com/cdn-cgi/trace
 */
export const CF_TRACE_URL = 'https://cloudflare.com/cdn-cgi/trace';

/** Timeout for the network-info lookup (ms). */
export const ISP_TIMEOUT_MS = 5000;
