/**
 * ISP / public-IP detection.
 *
 * Tries each configured provider in order and renders the first usable result
 * into the navigation bar. Failures are silent — this is a best-effort
 * enhancement, not a hard dependency of the speed test.
 *
 * @module isp
 */

import { ISP_PROVIDERS, ISP_TIMEOUT_MS } from './config.js';
import { byId, setText } from './dom.js';

/** Strip a leading autonomous-system number from an org string. */
const cleanOrg = (org) => (org || '').replace(/^AS\d+\s+/i, '').trim();

/**
 * Detect the visitor's ISP and location, updating the nav bar in place.
 * @returns {Promise<void>}
 */
export async function detectISP() {
  for (const provider of ISP_PROVIDERS) {
    try {
      const response = await fetch(provider.url, { signal: AbortSignal.timeout(ISP_TIMEOUT_MS) });
      if (!response.ok) continue;

      const data = await response.json();
      if (!provider.isValid(data)) continue;

      const { ip, org, city, country } = provider.normalize(data);
      setText('isp-name', cleanOrg(org) || 'Unknown ISP');
      setText('isp-ip', ip || '');
      setText('isp-loc', [city, country].filter(Boolean).join(', '));

      if (ip) byId('isp-sep1').style.display = '';
      if (city || country) byId('isp-sep2').style.display = '';
      return;
    } catch {
      // Provider unreachable or timed out — try the next one.
    }
  }
  setText('isp-name', 'ISP unavailable');
}
