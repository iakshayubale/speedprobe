/**
 * Test history, persisted to `localStorage`.
 *
 * History is stored newest-first and capped at {@link HISTORY_LIMIT} entries.
 * All access is defensive so a corrupt or full store never breaks the app.
 *
 * @module history
 */

import { STORAGE_KEY, HISTORY_LIMIT } from './config.js';
import { state } from './state.js';
import { byId } from './dom.js';
import { formatSpeed, formatMs, formatTimeAgo } from './utils.js';
import { gradeColor } from './analysis.js';

/**
 * @typedef {Object} HistoryEntry
 * @property {number} ts
 * @property {number} download
 * @property {number} upload
 * @property {number} ping
 * @property {number} jitter
 * @property {number} bufferbloat
 * @property {number} consistency
 * @property {string} grade
 */

/**
 * Read the stored history.
 * @returns {HistoryEntry[]}
 */
export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Persist the current results as the newest history entry. */
export function saveHistory() {
  const r = state.results;
  if (!r.download) return;

  /** @type {HistoryEntry} */
  const entry = {
    ts: Date.now(),
    download: r.download,
    upload: r.upload || 0,
    ping: r.ping || 0,
    jitter: r.jitter || 0,
    bufferbloat: r.bufferbloat || 0,
    consistency: r.consistency || 0,
    grade: r.grade || '—',
  };

  const history = getHistory();
  history.unshift(entry);
  if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Storage full or unavailable — history is a nice-to-have, so ignore.
  }
}

/** Clear all history and re-render the (now empty) table. */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

/**
 * Build the speed cell with a label, value, unit and a mini proportional bar.
 * @param {number} value      Mbps value
 * @param {number} maxMbps    Reference max used to scale the bar (e.g. 1000)
 * @param {'hist-down'|'hist-up'} cssClass  Accent class
 */
function speedCell(value, maxMbps, cssClass) {
  const pct = Math.min(100, (value / maxMbps) * 100).toFixed(1);
  return (
    `<div class="hist-cell ${cssClass}">` +
    `<div class="hist-speed-wrap">` +
    `<div class="hist-speed-top">` +
    `<span class="hist-speed-val">${formatSpeed(value)}</span>` +
    `<span class="hist-speed-unit">Mbps</span>` +
    `</div>` +
    `<div class="hist-speed-bar">` +
    `<div class="hist-speed-fill" style="width:${pct}%"></div>` +
    `</div>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Build a ping/jitter cell.
 * @param {number} ms
 */
function latencyCell(ms) {
  return (
    `<div class="hist-cell">` +
    `<span class="hist-ping-val">${formatMs(ms)}</span>` +
    `<span class="hist-ping-unit">ms</span>` +
    `</div>`
  );
}

/** Render the history table from storage. */
export function renderHistory() {
  const container = byId('hist-rows');
  const history = getHistory();

  if (history.length === 0) {
    container.innerHTML = '<div class="hist-empty">No tests recorded yet. Run your first test above.</div>';
    return;
  }

  // Scale bars relative to the fastest download in this history set.
  const maxDown = Math.max(...history.map((h) => h.download), 1);
  const maxUp   = Math.max(...history.map((h) => h.upload),   1);

  container.innerHTML = history
    .map((h, i) => {
      const color = gradeColor(h.grade);
      return (
        `<div class="hist-row">` +
        `<div class="hist-cell hist-idx">${i + 1}</div>` +
        `<div class="hist-cell hist-ts">${formatTimeAgo(h.ts)}</div>` +
        speedCell(h.download, maxDown, 'hist-down') +
        speedCell(h.upload,   maxUp,   'hist-up') +
        latencyCell(h.ping) +
        latencyCell(h.jitter) +
        `<div class="hist-cell hist-grade">` +
        `<span class="hist-grade-badge" style="color:${color};border-color:${color}20;background:${color}12">${h.grade}</span>` +
        `</div>` +
        `</div>`
      );
    })
    .join('');
}
