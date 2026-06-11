/**
 * The measurement engine: latency/jitter, download (with timing breakdown and
 * bufferbloat) and upload.
 *
 * Each stage mutates `state.results` and feeds the live gauge/graph. Stages
 * honour `state.cancelRequested` so a run can be aborted promptly.
 *
 * @module measurements
 */

import { ENDPOINTS, TEST } from './config.js';
import { state } from './state.js';
import { gauge, graph, setMetricValue } from './viz.js';
import { byId } from './dom.js';
import { sleep, median, standardDeviation, mean, clamp, toMbps, formatSpeed, formatMs } from './utils.js';

/** Cache-busting query string. */
const nonce = () => `_=${Date.now()}`;

/**
 * Measure unloaded latency, jitter and packet loss with a burst of tiny
 * requests, writing `ping`, `jitter` and `packetLoss` into the results.
 * @returns {Promise<void>}
 */
export async function measureLatency() {
  const latencies = [];
  let failed = 0;

  for (let i = 0; i < TEST.latencyProbes; i++) {
    if (state.cancelRequested) return;
    try {
      const start = performance.now();
      await fetch(`${ENDPOINTS.download}?bytes=0&${nonce()}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(TEST.latencyTimeoutMs),
      });
      const latency = performance.now() - start;
      latencies.push(latency);
      state.latencySamples.push({ t: performance.now(), v: latency });
      setMetricValue('v-ping', formatMs(median(latencies)));
      await sleep(TEST.latencyGapMs);
    } catch {
      failed++;
    }
  }

  state.results.packetLoss = (failed / TEST.latencyProbes) * 100;
  if (latencies.length > 0) {
    state.results.ping = median(latencies);
    state.results.jitter = standardDeviation(latencies);
    setMetricValue('v-ping', formatMs(state.results.ping));
    setMetricValue('v-jitter', formatMs(state.results.jitter));
    byId('mc-jitter')?.classList.add('done');
  }
}

/**
 * Capture DNS/TCP/TLS/TTFB timing for the Cloudflare edge using the Resource
 * Timing API. Best-effort: silently skips if timing is unavailable.
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
      .filter((entry) => entry.name.includes('speed.cloudflare.com'));
    if (entries.length === 0) return;

    const entry = entries[entries.length - 1];
    if (entry.domainLookupEnd > 0) {
      state.results.dnsTime = Math.max(0, entry.domainLookupEnd - entry.domainLookupStart);
      state.results.tcpTime = Math.max(0, entry.connectEnd - entry.connectStart);
      state.results.tlsTime =
        entry.secureConnectionStart > 0 ? Math.max(0, entry.connectEnd - entry.secureConnectionStart) : 0;
      state.results.ttfb = Math.max(0, entry.responseStart - entry.requestStart);
    }
  } catch {
    // Timing data unavailable (cross-origin restriction or cache) — ignore.
  }
}

/**
 * Measure download throughput by streaming a large payload, while concurrently
 * probing latency to detect bufferbloat. Writes `download`, `peakDownload`,
 * `consistency` and `bufferbloat`.
 * @returns {Promise<void>}
 */
export async function measureDownload() {
  await captureConnectionTiming();

  const url = `${ENDPOINTS.download}?bytes=${TEST.downloadBytes}&${nonce()}`;
  const start = performance.now();
  let received = 0;
  const speeds = [];
  const loadedLatencies = [];

  // Probe latency under load to quantify bufferbloat.
  const bufferbloatProbe = setInterval(async () => {
    if (state.cancelRequested) {
      clearInterval(bufferbloatProbe);
      return;
    }
    try {
      const probeStart = performance.now();
      await fetch(`${ENDPOINTS.download}?bytes=0&${nonce()}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2000),
      });
      const latency = performance.now() - probeStart;
      loadedLatencies.push(latency);
      graph.addLatency(performance.now(), latency);
    } catch {
      // Ignore individual probe failures.
    }
  }, TEST.bufferbloatProbeMs);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TEST.downloadTimeoutMs),
    });
    const reader = response.body.getReader();

    for (;;) {
      if (state.cancelRequested) {
        reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      received += value.length;
      const elapsed = (performance.now() - start) / 1000;
      if (elapsed > TEST.minSampleSeconds) {
        const speed = toMbps(received, elapsed);
        gauge.setValue(speed);
        speeds.push(speed);
        graph.addSpeed(performance.now(), speed);
        setMetricValue('v-down', formatSpeed(speed));
      }
    }
  } finally {
    clearInterval(bufferbloatProbe);
  }

  if (speeds.length > 4) {
    state.results.peakDownload = Math.max(...speeds);
    const sorted = [...speeds].sort((a, b) => a - b);
    const lo = Math.floor(sorted.length * 0.75);
    const hi = Math.floor(sorted.length * 0.95);
    const steady = sorted.slice(lo, hi + 1);
    state.results.download = mean(steady);
    state.results.consistency = clamp(100 - (standardDeviation(speeds) / mean(speeds)) * 100, 0, 100);
    setMetricValue('v-down', formatSpeed(state.results.download));
  }

  if (loadedLatencies.length > 1 && state.results.ping != null) {
    state.results.bufferbloat = median(loadedLatencies) - state.results.ping;
  }
}

/**
 * Measure upload throughput.
 *
 * We deliberately use `fetch` with `mode: 'no-cors'` rather than `XMLHttpRequest`.
 * Attaching an `xhr.upload` progress listener forces a CORS preflight (OPTIONS),
 * which the Cloudflare `__up` endpoint does not answer — so XHR uploads always
 * failed with a CORS error. A no-cors fetch sends a "simple" request (no
 * preflight) and resolves with an opaque response. Since per-byte progress is
 * unavailable, we upload several sequential chunks and time each one to drive
 * the live gauge and graph.
 * @returns {Promise<void>}
 */
export async function measureUpload() {
  const payload = new Uint8Array(TEST.uploadChunkBytes);
  crypto.getRandomValues(payload.subarray(0, Math.min(65536, TEST.uploadChunkBytes)));

  const speeds = [];
  let totalBytes = 0;
  let failures = 0;
  const start = performance.now();

  for (let i = 0; i < TEST.uploadChunks; i++) {
    if (state.cancelRequested) return;

    const chunkStart = performance.now();
    try {
      await fetch(`${ENDPOINTS.upload}?${nonce()}`, {
        method: 'POST',
        body: new Blob([payload]),
        mode: 'no-cors',
        cache: 'no-store',
        signal: AbortSignal.timeout(TEST.uploadTimeoutMs),
      });
    } catch {
      failures++;
      if (failures >= TEST.uploadChunks) throw new Error('Upload failed (all chunks)');
      continue;
    }

    const elapsed = (performance.now() - chunkStart) / 1000;
    totalBytes += TEST.uploadChunkBytes;
    if (elapsed > 0.03) {
      const speed = toMbps(TEST.uploadChunkBytes, elapsed);
      speeds.push(speed);
      gauge.setValue(speed);
      graph.addSpeed(performance.now(), speed);
      setMetricValue('v-up', formatSpeed(speed));
    }
  }

  if (totalBytes > 0) {
    // Overall throughput accounts for setup overhead; report the better of it
    // and the trimmed steady-state samples.
    const overall = toMbps(totalBytes, (performance.now() - start) / 1000);
    let value = overall;
    if (speeds.length > 2) {
      const sorted = [...speeds].sort((a, b) => a - b);
      const trimmed = mean(sorted.slice(Math.floor(sorted.length * 0.4)));
      value = Math.max(overall, trimmed);
    }
    state.results.upload = value;
    setMetricValue('v-up', formatSpeed(value));
  }
}
