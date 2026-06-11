/**
 * Network-info detection via Cloudflare's own cdn-cgi/trace endpoint.
 *
 * Uses only Cloudflare infrastructure — no third-party services, no data sent
 * outside Cloudflare's network. Returns the client IP and country code.
 * Best-effort: silently degrades if the request fails.
 *
 * @module isp
 * @see https://cloudflare.com/cdn-cgi/trace
 */

import { CF_TRACE_URL, ISP_TIMEOUT_MS } from './config.js';
import { byId, setText } from './dom.js';

/**
 * Parse Cloudflare's plain-text trace response into a key/value map.
 * Format: one `key=value` pair per line.
 * @param {string} text
 * @returns {Record<string, string>}
 */
const parseTrace = (text) =>
  Object.fromEntries(
    text.trim().split('\n').map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
  );

/**
 * Detect the visitor's IP and country using Cloudflare's trace endpoint,
 * then update the navigation bar. Failures are silent.
 * @returns {Promise<void>}
 */
export async function detectISP() {
  try {
    const response = await fetch(CF_TRACE_URL, {
      signal: AbortSignal.timeout(ISP_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error('trace request failed');

    const fields = parseTrace(await response.text());
    const { ip, loc } = fields;

    if (ip) {
      setText('isp-ip', ip);
      byId('isp-sep1').style.display = '';
    }
    if (loc) {
      setText('isp-loc', loc);
      byId('isp-sep2').style.display = '';
    }
    // Hide the ISP-name slot — cdn-cgi/trace does not expose ASN/org names.
    byId('isp-name').style.display = 'none';
  } catch {
    setText('isp-name', 'Network unavailable');
  }
}
