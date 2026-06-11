/**
 * Visualization singletons and small UI-state helpers.
 *
 * Owns the single `Gauge` and `Graph` instances and exposes the phase/metric
 * helpers that several modules use to keep the hero section in sync with the
 * running test.
 *
 * @module viz
 */

import { Gauge } from './gauge.js';
import { Graph } from './graph.js';
import { byId, setText } from './dom.js';

/** Shared gauge instance. */
export const gauge = new Gauge(byId('gauge-canvas'));

/** Shared graph instance. */
export const graph = new Graph(byId('graph-canvas'));

window.addEventListener('resize', () => graph.resize());

/** Metric-card element ids, in display order. */
const METRIC_CARD_IDS = ['mc-ping', 'mc-jitter', 'mc-down', 'mc-up'];

/**
 * Update the gauge phase label, accent colour and halo.
 * @param {'idle'|'ping'|'download'|'upload'|'complete'} phase
 * @param {string} label
 */
export function setPhase(phase, label) {
  const phaseEl = byId('gauge-phase');
  if (phaseEl) {
    phaseEl.textContent = label;
    phaseEl.className = `gauge-phase phase-${phase}`;
  }
  gauge.setPhase(phase);
  byId('gauge-halo')?.classList.toggle('active', phase !== 'idle' && phase !== 'complete');
}

/**
 * Highlight a single active metric card (or clear all when null).
 * @param {string | null} activeId
 */
export function setMetricActive(activeId) {
  for (const id of METRIC_CARD_IDS) {
    const el = byId(id);
    if (el) el.className = 'metric-card';
  }
  if (activeId) {
    const el = byId(activeId);
    if (el) el.className = `metric-card active-${activeId.replace('mc-', '')}`;
  }
}

/** Mark every metric card as completed. */
export function markMetricsDone() {
  for (const id of METRIC_CARD_IDS) byId(id)?.classList.add('done');
}

/** Reset every metric card to its neutral state. */
export function resetMetricCards() {
  for (const id of METRIC_CARD_IDS) {
    const el = byId(id);
    if (el) el.className = 'metric-card';
  }
}

/**
 * Update a metric value readout.
 * @param {string} id
 * @param {string} value
 */
export const setMetricValue = setText;
