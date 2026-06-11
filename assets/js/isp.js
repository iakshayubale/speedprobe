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
 * Uses two Cloudflare-native sources in parallel:
 *  1. cdn-cgi/trace     — colo (datacenter), loc (country code), ip
 *  2. speed.cloudflare.com/__down?bytes=0 — cf-meta-asn, cf-meta-city,
 *     cf-meta-country, cf-meta-ip (populated only on fresh connections)
 *
 * The trace result always provides a meaningful label. The speed-test headers
 * provide richer org/city data when Cloudflare populates them.
 *
 * @returns {Promise<void>}
 */
export async function detectISP() {
  try {
    // Run both sources in parallel — whichever finishes first updates the UI.
    const [traceRes, metaRes] = await Promise.allSettled([
      fetch(CF_TRACE_URL, { signal: AbortSignal.timeout(ISP_TIMEOUT_MS) }),
      fetch(`${ENDPOINTS.download}?bytes=0&_=${Date.now()}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(ISP_TIMEOUT_MS),
      }),
    ]);

    // --- Parse trace (always available) ---
    let traceIp = '', traceColo = '', traceLoc = '';
    if (traceRes.status === 'fulfilled' && traceRes.value.ok) {
      const fields = parseTrace(await traceRes.value.text());
      traceIp   = fields.ip   || '';
      traceColo = fields.colo || '';
      traceLoc  = fields.loc  || '';
    }

    // --- Parse speed-test response headers (enrichment, may be empty) ---
    let metaAsn = '', metaCity = '', metaCountry = '', metaIp = '';
    if (metaRes.status === 'fulfilled') {
      const h = metaRes.value.headers;
      metaAsn     = h.get('cf-meta-asn')     || '';
      metaCity    = h.get('cf-meta-city')     || '';
      metaCountry = h.get('cf-meta-country')  || '';
      metaIp      = h.get('cf-meta-ip')       || '';
    }

    // --- Build display values ---
    // ISP/org name: prefer ASN header, fall back to datacenter+country from trace
    const org = cleanOrg(metaAsn);
    const label = org || [traceColo, traceLoc].filter(Boolean).join(' · ') || 'Cloudflare';

    // Location: prefer city+country from headers, fall back to colo+loc from trace
    const location = metaCity && metaCountry
      ? `${metaCity}, ${metaCountry}`
      : [traceColo, traceLoc].filter(Boolean).join(' · ');

    // IP: prefer header (may differ from trace for proxied/dual-stack), fall back
    const ip = metaIp || traceIp;

    setText('isp-name', label);

    if (ip) {
      setText('isp-ip', formatIP(ip));
      byId('isp-sep1').style.display = '';
    }
    if (location && location !== label) {
      setText('isp-loc', location);
      byId('isp-sep2').style.display = '';
    }
  } catch {
    setText('isp-name', 'Network unavailable');
  }
}
