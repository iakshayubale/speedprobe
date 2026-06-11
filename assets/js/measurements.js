/**
 * Measurement engine — powered by the official @cloudflare/speedtest SDK.
 *
 * Using the official Cloudflare library ensures methodology and Terms of Service
 * alignment. The SDK drives the same speed.cloudflare.com endpoints with
 * Cloudflare's own ramp-up algorithm and percentile calculations.
 *
 * DNS / TCP / TLS / TTFB timing is captured separately via the
 * PerformanceResourceTiming API, which the SDK does not expose directly.
 *
 * @module measurements
 * @see https://github.com/cloudflare/speedtest
 */

// Official Cloudflare speedtest SDK (MIT) — self-hosted from assets/js/vendor/.
// Source: https://github.com/cloudflare/speedtest  v1.10.1
// Self-hosting avoids any third-party CDN dependency and keeps all requests
// within this domain (consistent with the "No tracking" guarantee).
import SpeedTest from './vendor/speedtest.js';

import { ENDPOINTS } from './config.js';
import { state } from './state.js';
import { gauge, graph, setMetricValue } from './viz.js';
import { clamp, formatSpeed, formatMs } from './utils.js';

/** Cache-busting nonce for the timing-capture probe. */
const nonce = () => `_=${Date.now()}`;

/**
 * Capture DNS / TCP / TLS / TTFB timing from the PerformanceResourceTiming API.
 * Best-effort: silently skips when cross-origin timing data is blocked (common
 * in some browsers) or when an existing cached connection collapses the timings.
 * @private
 */
async function captureConnectionTiming() {
  try {
    await fetch(`${ENDPOINTS.download}?bytes=0&timing=1&${nonce()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const entries = performance
      .getEntriesByType('resource')
      .filter((e) => e.name.includes('speed.cloudflare.com'));
    if (!entries.length) return;

    const entry = entries[entries.length - 1];
    if (entry.domainLookupEnd > 0) {
      state.results.dnsTime = Math.max(0, entry.domainLookupEnd - entry.domainLookupStart);
      state.results.tcpTime = Math.max(0, entry.connectEnd - entry.connectStart);
      state.results.tlsTime =
        entry.secureConnectionStart > 0
          ? Math.max(0, entry.connectEnd - entry.secureConnectionStart)
          : 0;
      state.results.ttfb = Math.max(0, entry.responseStart - entry.requestStart);
    }
  } catch {
    // Timing unavailable — ignore.
  }
}

/**
 * Run the full measurement suite using the official @cloudflare/speedtest SDK.
 *
 * The SDK drives Cloudflare's standard ramp-up methodology (multiple file sizes,
 * parallel probing, percentile-based aggregation) — the same algorithm that
 * powers https://speed.cloudflare.com.
 *
 * Drives the live gauge, graph and metric displays as results arrive via
 * `onResultsChange`. Resolves when all measurements are complete or when the
 * user cancels.
 *
 * @param {{ onPhase?: (phase: 'latency'|'download'|'upload') => void }} [opts]
 * @returns {Promise<void>}
 */
export async function runMeasurements({ onPhase } = {}) {
  await captureConnectionTiming();

  return new Promise((resolve, reject) => {
    const engine = new SpeedTest({ autoStart: false });

    /** Track which phase is currently active to avoid redundant callbacks. */
    let activePhase = null;

    engine.onResultsChange = ({ type }) => {
      if (state.cancelRequested) {
        engine.pause();
        resolve();
        return;
      }

      const r = engine.results;

      /* ── Latency / jitter ──────────────────────────────────────────── */
      if (type === 'latency') {
        if (activePhase !== 'latency') {
          activePhase = 'latency';
          onPhase?.('latency');
        }
        const ping   = r.getUnloadedLatency();
        const jitter = r.getUnloadedJitter();
        if (ping   != null) { state.results.ping   = ping;   setMetricValue('v-ping',   formatMs(ping));   }
        if (jitter != null) { state.results.jitter = jitter; setMetricValue('v-jitter', formatMs(jitter)); }
      }

      /* ── Download ──────────────────────────────────────────────────── */
      if (type === 'download') {
        if (activePhase !== 'download') {
          activePhase = 'download';
          onPhase?.('download');
        }
        const pts = r.getDownloadBandwidthPoints();
        if (pts?.length) {
          const mbps = pts[pts.length - 1].bps / 1e6;
          gauge.setValue(mbps);
          graph.addSpeed(performance.now(), mbps);
          setMetricValue('v-down', formatSpeed(mbps));
          state.results.download = mbps;
        }
        // Loaded latency (under download load) → bufferbloat delta
        const loaded = r.getDownLoadedLatency();
        if (loaded != null) {
          if (state.results.ping != null) {
            state.results.bufferbloat = loaded - state.results.ping;
          }
          graph.addLatency(performance.now(), loaded);
        }
      }

      /* ── Upload ────────────────────────────────────────────────────── */
      if (type === 'upload') {
        if (activePhase !== 'upload') {
          activePhase = 'upload';
          onPhase?.('upload');
        }
        const pts = r.getUploadBandwidthPoints();
        if (pts?.length) {
          const mbps = pts[pts.length - 1].bps / 1e6;
          gauge.setValue(mbps);
          graph.addSpeed(performance.now(), mbps);
          setMetricValue('v-up', formatSpeed(mbps));
          state.results.upload = mbps;
        }
      }
    };

    engine.onFinish = (results) => {
      // Settle final authoritative values from the SDK's percentile calculations
      const ping   = results.getUnloadedLatency();
      const jitter = results.getUnloadedJitter();
      const dlBps  = results.getDownloadBandwidth();
      const ulBps  = results.getUploadBandwidth();

      if (ping   != null) { state.results.ping     = ping;         setMetricValue('v-ping',   formatMs(ping));          }
      if (jitter != null) { state.results.jitter   = jitter;       setMetricValue('v-jitter', formatMs(jitter));        }
      if (dlBps  != null) { state.results.download = dlBps / 1e6;  setMetricValue('v-down',   formatSpeed(dlBps / 1e6));}
      if (ulBps  != null) { state.results.upload   = ulBps / 1e6;  setMetricValue('v-up',     formatSpeed(ulBps / 1e6));}

      // Derive speed consistency and peak download from the bandwidth time series
      const dlPts = results.getDownloadBandwidthPoints() || [];
      if (dlPts.length > 2) {
        const vals = dlPts.map((p) => p.bps);
        const avg  = vals.reduce((s, v) => s + v, 0) / vals.length;
        const std  = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length);
        state.results.consistency  = clamp(100 - (std / avg) * 100, 0, 100);
        state.results.peakDownload = Math.max(...vals) / 1e6;
      }

      // Packet loss from SDK (only populated when a TURN server is configured)
      const pl = results.getPacketLoss?.();
      if (pl != null) state.results.packetLoss = pl * 100;

      resolve();
    };

    engine.onError = (err) => reject(new Error(String(err)));

    engine.play();
  });
}


