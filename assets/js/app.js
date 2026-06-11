/**
 * Application entry point.
 *
 * Wires together the modules, owns the high-level test orchestration and binds
 * the UI event handlers. Loaded as an ES module, so it runs after the DOM is
 * parsed and there are no globals to leak.
 *
 * @module app
 */

import { installAbortSignalTimeout } from './utils.js';
import { initBackground } from './background.js';
import { initTooltips } from './tooltip.js';
import { detectISP } from './isp.js';
import { state, resetState } from './state.js';
import { byId, setText } from './dom.js';
import {
  gauge,
  graph,
  setPhase,
  setMetricActive,
  markMetricsDone,
  resetMetricCards,
  setMetricValue,
} from './viz.js';
import { runMeasurements } from './measurements.js';
import { showAnalysis } from './analysis.js';
import { saveHistory, renderHistory, clearHistory } from './history.js';
import { shareResults, copyResults } from './share.js';

/** Sections revealed during/after a run; reset between runs. */
const RESULT_SECTIONS = ['analysis', 'insights', 'usecases'];

/** Metric value readouts to clear at the start of a run. */
const METRIC_VALUE_IDS = ['v-ping', 'v-jitter', 'v-down', 'v-up'];

/* ───────────────────────────── Test lifecycle ──────────────────────── */

/** Toggle the start button between its start/cancel/running visual states. */
function setButtonState(stateName) {
  const button = byId('start-btn');
  const label = byId('btn-label');
  const arc = byId('btn-arc');

  button.classList.remove('running', 'done');
  arc.style.display = 'none';

  switch (stateName) {
    case 'running':
      button.classList.add('running');
      arc.style.display = '';
      label.textContent = 'CANCEL';
      break;
    case 'done':
      button.classList.add('done');
      label.textContent = 'AGAIN';
      break;
    default:
      label.textContent = 'START';
  }
}

/** Prepare the UI for a fresh run. */
function prepareRun() {
  resetState();
  graph.reset();

  setButtonState('running');
  byId('live-graph').classList.add('visible');
  RESULT_SECTIONS.forEach((id) => byId(id).classList.remove('visible'));
  byId('share-row').classList.remove('visible');
  resetMetricCards();
  METRIC_VALUE_IDS.forEach((id) => setMetricValue(id, '—'));
  gauge.setValue(0);
}

/**
 * Run a single measurement stage, recording any error without aborting the run.
 * @param {string} name
 * @param {() => Promise<void>} stage
 * @param {Array<[string, unknown]>} errors
 */
async function runStage(name, stage, errors) {
  if (state.cancelRequested) return;
  try {
    await stage();
  } catch (error) {
    errors.push([name, error]);
  }
}

/** Handle the case where no stage produced any data (usually a CORS block). */
function handleTotalFailure(errors) {
  const openedFromFile = location.protocol === 'file:';
  setPhase('idle', openedFromFile ? 'Blocked — Open via http://' : 'Network Error — Retry');
  console.error('SpeedProbe: no measurements succeeded.', errors);

  if (openedFromFile) {
    setText(
      'grade-desc',
      'Your browser blocked the test because this page was opened directly from a file. ' +
        'Serve it over http://localhost instead (e.g. run "python3 -m http.server" in this ' +
        'folder) or open it in Chrome.',
    );
    byId('analysis').classList.add('visible');
  }
  finishTest(false);
}

/** Orchestrate a full test: latency → download → upload → analysis. */
async function runTest() {
  state.running = true;
  prepareRun();

  /** @type {Array<[string, unknown]>} */
  const errors = [];

  // Initial phase: latency. Phase transitions (download → upload) are driven
  // by the SDK via the onPhase callback as the engine progresses.
  setPhase('ping', 'Measuring Latency…');
  setMetricActive('mc-ping');

  await runMeasurements({
    onPhase(phase) {
      if (phase === 'download') {
        setPhase('download', 'Download…');
        setMetricActive('mc-down');
        gauge.setValue(0);
      }
      if (phase === 'upload') {
        setPhase('upload', 'Upload…');
        setMetricActive('mc-up');
        gauge.setValue(0);
      }
    },
  }).catch((err) => errors.push(['measurements', err]));

  if (state.cancelRequested) {
    setPhase('idle', 'Cancelled');
    finishTest(false);
    return;
  }

  const hasData =
    state.results.download != null || state.results.upload != null || state.results.ping != null;
  if (!hasData) {
    handleTotalFailure(errors);
    return;
  }

  setPhase('complete', errors.length ? 'Complete (partial)' : 'Complete');
  setMetricActive(null);
  markMetricsDone();
  showAnalysis();
  saveHistory();
  renderHistory();
  finishTest(true);

  if (errors.length) console.warn('SpeedProbe: some stages failed:', errors);
}

/** Restore the idle/complete UI after a run finishes or fails. */
function finishTest(succeeded) {
  state.running = false;
  setButtonState(succeeded ? 'done' : 'idle');
  byId('gauge-halo').classList.remove('active');
}

/** Start a new test, or cancel the in-progress one. */
function handleStartClick() {
  if (state.running) {
    state.cancelRequested = true;
    return;
  }
  runTest();
}

/* ──────────────────────────────── Bootstrap ────────────────────────── */

function init() {
  installAbortSignalTimeout();
  initBackground();
  initTooltips();
  detectISP();
  renderHistory();

  byId('start-btn').addEventListener('click', handleStartClick);
  byId('share-btn').addEventListener('click', shareResults);
  byId('copy-btn').addEventListener('click', copyResults);
  byId('clear-btn').addEventListener('click', clearHistory);
}

init();
