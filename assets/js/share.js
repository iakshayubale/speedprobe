/**
 * Sharing helpers: the Web Share API with a clipboard fallback.
 *
 * @module share
 */

import { state } from './state.js';
import { byId } from './dom.js';
import { formatSpeed, formatMs } from './utils.js';

/**
 * Build a concise, human-readable summary of the latest results.
 * @returns {string}
 */
function buildSummary() {
  const { download = 0, upload = 0, ping = 0, jitter = 0, grade = '—' } = state.results;
  return (
    'My internet speed:\n' +
    `⬇ ${formatSpeed(download)} Mbps · ⬆ ${formatSpeed(upload)} Mbps · ` +
    `🏓 ${formatMs(ping)}ms · Jitter ${formatMs(jitter)}ms · Grade: ${grade}\n` +
    'Tested with SpeedProbe'
  );
}

/**
 * Copy text to the clipboard and flash the copy button.
 * @param {string} text
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    const button = byId('copy-btn');
    if (!button) return;
    button.classList.add('copied');
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.classList.remove('copied');
      button.textContent = 'Copy to Clipboard';
    }, 2200);
  } catch {
    // Clipboard blocked (e.g. insecure context) — nothing else we can do.
  }
}

/** Share results via the native share sheet, falling back to clipboard. */
export async function shareResults() {
  const text = buildSummary();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'My SpeedProbe Results', text });
      return;
    } catch {
      // User dismissed the share sheet or it is unavailable — fall through.
    }
  }
  copyToClipboard(text);
}

/** Copy results to the clipboard. */
export async function copyResults() {
  copyToClipboard(buildSummary());
}
