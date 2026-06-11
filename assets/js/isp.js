/**
 * Network-info detection via Cloudflare's own speed-test endpoint.
 *
 * Uses only Cloudflare infrastructure — no third-party services.
 * Reads cf-meta-* response headers from speed.cloudflare.com/__down?bytes=0
 * (CORS-exposed by Cloudflare) for ASN/org, city, country and IP.
 * Falls back to cdn-cgi/trace for just IP + country if headers are absent.
 *
 * @module isp
 * @see https://github.com/cloudflare/speedtest
 */

import { ENDPOINTS, CF_TRACE_URL, ISP_TIMEOUT_MS } from './config.js';
import { byId, setText } from './dom.js';

/**
 * Parse Cloudflare's plain-text cdn-cgi/trace response into a key/value map.
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
 * Format an IP address for compact nav display.
 * IPv6 is truncated to the first two groups followed by '…'.
 * @param {string} ip
 * @returns {string}
 */
const formatIP = (ip) => {
  if (!ip.includes(':')) return ip;
  const parts = ip.split(':');
  return `${parts[0]}:${parts[1]}:…`;
};

/** Strip a leading AS-number prefix from an org/ASN string. */
const cleanOrg = (s) => (s || '').replace(/^AS\d+\s*/i, '').trim();

/**
 * Detect ISP, IP and location using Cloudflare's own infrastructure.
 *
 * Primary: reads cf-meta-asn, cf-meta-city, cf-meta-country, cf-meta-ip from
 * the speed.cloudflare.com/__down?bytes=0 response headers. These are
 * explicitly listed in access-control-expose-headers so JavaScript can read them.
 *
 * Fallback: cdn-cgi/trace for IP + country when headers are absent (e.g. cached
 * connections that reuse an existing socket).
 *
 * @returns {Promise<void>}
 */
export async function detectISP() {
  try {
    // Primary: probe the Cloudflare speed-test edge — headers carry geo/ASN data.
    const res = await fetch(`${ENDPOINTS.download}?bytes=0&_=${Date.now()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(ISP_TIMEOUT_MS),
    });

    const asn     = res.headers.get('cf-meta-asn');      // e.g. "AS7922 Comcast"
    const city    = res.headers.get('cf-meta-city');
    const country = res.headers.get('cf-meta-country');
    const metaIp  = res.headers.get('cf-meta-ip');

    if (asn || city || country || metaIp) {
      const org = cleanOrg(asn);
      setText('isp-name', org || 'Unknown ISP');

      if (metaIp) {
        setText('isp-ip', formatIP(metaIp));
        byId('isp-sep1').style.display = '';
      }
      if (city || country) {
        setText('isp-loc', [city, country].filter(Boolean).join(', '));
        byId('isp-sep2').style.display = '';
      }
      return;
    }

    // Fallback: cdn-cgi/trace gives at least IP + country + datacenter.
    const trace  = await fetch(CF_TRACE_URL, { signal: AbortSignal.timeout(ISP_TIMEOUT_MS) });
    const fields = parseTrace(await trace.text());
    const { ip, loc, colo } = fields;

    setText('isp-name', [colo, loc].filter(Boolean).join(' · ') || 'Cloudflare');
    if (ip) {
      setText('isp-ip', formatIP(ip));
      byId('isp-sep1').style.display = '';
    }
  } catch {
    setText('isp-name', 'Network unavailable');
  }
}
