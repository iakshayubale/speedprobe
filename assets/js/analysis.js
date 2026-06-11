/**
 * Post-test analysis: overall grade, bufferbloat rating, deep diagnostic
 * insight cards, the use-case compatibility matrix and the reveal sequencing.
 *
 * @module analysis
 */

import { COLORS } from './config.js';
import { state } from './state.js';
import { byId, setText } from './dom.js';
import { formatSpeed, formatMs } from './utils.js';

/* ─────────────────────────── Icon library ───────────────────────────── */

/**
 * Minimal SVG icon builder. Produces a 20×20 stroke-based crystal icon.
 * All icons use currentColor so CSS can tint them.
 * @param {string} paths  Inner SVG markup
 * @returns {string}
 */
const I = (paths) =>
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/** Icon set for insight cards and use-case cards. */
const ICONS = {
  // ── Diagnostic insights ───────────────────────────────────────────
  /** Packet Loss: network nodes, one struck through */
  packetLoss:   I('<circle cx="4" cy="10" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="16" cy="16" r="2"/><line x1="6" y1="9" x2="14" y2="5"/><line x1="6" y1="11" x2="14" y2="15"/><line x1="14" y1="3" x2="18" y2="5" stroke-opacity="0.35"/><line x1="14" y1="5" x2="18" y2="3" stroke-opacity="0.35"/>'),
  /** DNS: clock face (resolution = time) */
  dns:          I('<circle cx="10" cy="10" r="7"/><polyline points="10,6.5 10,10 12.5,12"/>'),
  /** TCP Handshake: two interlocking arrows */
  tcp:          I('<path d="M3 8 L8 5 L8 11 Z"/><path d="M17 12 L12 15 L12 9 Z"/><line x1="8" y1="8" x2="12" y2="12"/>'),
  /** TTFB: hourglass / timer */
  ttfb:         I('<path d="M5 3 L15 3 Q15 8 10 10 Q5 12 5 17 L15 17"/><path d="M15 3 Q15 8 10 10 Q5 12 5 17 L15 17" stroke-opacity="0.28"/><line x1="5" y1="3" x2="15" y2="3"/><line x1="5" y1="17" x2="15" y2="17"/>'),
  /** Symmetry: balanced up/down arrows */
  symmetry:     I('<polyline points="6,8 10,4 14,8"/><line x1="10" y1="4" x2="10" y2="10"/><polyline points="6,12 10,16 14,12"/><line x1="10" y1="16" x2="10" y2="10"/>'),
  /** Connection fingerprint: concentric arcs (signal) */
  fingerprint:  I('<path d="M4 14 A8 8 0 0 1 16 14" stroke-opacity="0.25"/><path d="M6 12 A5.7 5.7 0 0 1 14 12" stroke-opacity="0.55"/><path d="M8 10 A3.4 3.4 0 0 1 12 10"/><circle cx="10" cy="14" r="1.2" fill="currentColor" stroke="none"/>'),
  /** Peak Burst: speedometer arc + needle */
  peakBurst:    I('<path d="M3 15 A9 9 0 0 1 17 15" stroke-opacity="0.22"/><path d="M3 15 A9 9 0 0 1 14.3 7.6"/><line x1="10" y1="14" x2="13.8" y2="8.2"/><circle cx="10" cy="14" r="1.5" fill="currentColor" stroke="none"/>'),
  /** TLS: shield with check */
  tls:          I('<path d="M10 2 L16 5 L16 10 Q16 14.5 10 17 Q4 14.5 4 10 L4 5 Z"/><polyline points="7.5,10 9.5,12 13,8"/>'),

  // ── Connection type fingerprint variants ──────────────────────────
  /** Mobile / 4G–5G: signal bars */
  mobile:       I('<line x1="3" y1="17" x2="3" y2="13"/><line x1="7.5" y1="17" x2="7.5" y2="10"/><line x1="12" y1="17" x2="12" y2="7"/><line x1="16.5" y1="17" x2="16.5" y2="4"/>'),
  /** Satellite: dish arc */
  satellite:    I('<path d="M3 17 A11 11 0 0 1 17 3"/><path d="M6 17 A8 8 0 0 1 17 6"/><circle cx="16" cy="4" r="2"/><line x1="10.5" y1="9.5" x2="7" y2="13"/>'),
  /** DSL: ethernet jack */
  dsl:          I('<rect x="6" y="3" width="8" height="10" rx="1"/><line x1="10" y1="13" x2="10" y2="17"/><line x1="8" y1="7" x2="8" y2="9"/><line x1="10" y1="7" x2="10" y2="9"/><line x1="12" y1="7" x2="12" y2="9"/>'),
  /** Cable: coaxial wave lines */
  cable:        I('<path d="M2 9 Q6 4 10 9 Q14 14 18 9"/><path d="M2 13 Q6 8 10 13 Q14 18 18 13" stroke-opacity="0.35"/>'),
  /** Fiber: diamond crystal (fast, symmetric) */
  fiber:        I('<path d="M10 2 L17 10 L10 18 L3 10 Z"/><line x1="3" y1="10" x2="17" y2="10" stroke-opacity="0.3"/><line x1="10" y1="2" x2="10" y2="18" stroke-opacity="0.3"/>'),
  /** Generic broadband: globe grid */
  broadband:    I('<circle cx="10" cy="10" r="7"/><path d="M3 10 Q10 5.5 17 10"/><path d="M3 10 Q10 14.5 17 10"/><line x1="10" y1="3" x2="10" y2="17" stroke-opacity="0.35"/>'),

  // ── Use-case cards ────────────────────────────────────────────────
  /** Competitive gaming: gamepad */
  gaming:       I('<rect x="2" y="6" width="16" height="10" rx="3"/><line x1="6" y1="9" x2="6" y2="13"/><line x1="4" y1="11" x2="8" y2="11"/><circle cx="13" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="12.5" r="1" fill="currentColor" stroke="none"/>'),
  /** Casual gaming: simple d-pad */
  casualGaming: I('<circle cx="10" cy="8" r="3"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="7" y1="14" x2="13" y2="14"/>'),
  /** 4K streaming: monitor */
  streaming4k:  I('<rect x="2" y="4" width="16" height="10" rx="1.5"/><line x1="7" y1="14" x2="7" y2="17"/><line x1="13" y1="14" x2="13" y2="17"/><line x1="5" y1="17" x2="15" y2="17"/>'),
  /** 8K streaming: film clapboard */
  streaming8k:  I('<rect x="2" y="6" width="16" height="12" rx="1.5"/><line x1="2" y1="10" x2="18" y2="10" stroke-opacity="0.35"/><line x1="6" y1="2" x2="5" y2="6"/><line x1="10" y1="2" x2="9" y2="6"/><line x1="14" y1="2" x2="13" y2="6"/><line x1="2" y1="6" x2="18" y2="6"/>'),
  /** Video calls: camera */
  videoCall:    I('<path d="M1 7 Q1 5 3 5 L11 5 Q13 5 13 7 L13 13 Q13 15 11 15 L3 15 Q1 15 1 13 Z"/><polyline points="13,9 19,6 19,14 13,11"/>'),
  /** Remote work: laptop */
  remoteWork:   I('<rect x="3" y="4" width="14" height="10" rx="1.5"/><line x1="1" y1="17" x2="19" y2="17"/>'),
  /** File transfer: upload arrow */
  fileTransfer: I('<polyline points="10,3 10,13"/><polyline points="6,7 10,3 14,7"/><line x1="4" y1="17" x2="16" y2="17"/>'),
  /** Smart home: house outline */
  smartHome:    I('<path d="M2 10 L10 3 L18 10"/><path d="M4 9 L4 17 L16 17 L16 9"/><rect x="8" y="13" width="4" height="4"/>'),
};

/* ─────────────────────────── Overall grade ─────────────────────────── */

/**
 * Compute an overall A+–F grade from a weighted penalty model across download,
 * upload, ping, jitter and bufferbloat.
 * @returns {string}
 */
function calculateGrade() {
  const { download = 0, upload = 0, ping = 999, jitter = 99, bufferbloat = 99 } = state.results;
  let score = 100;

  if (download >= 500) score -= 0;
  else if (download >= 200) score -= 4;
  else if (download >= 100) score -= 9;
  else if (download >= 50) score -= 16;
  else if (download >= 25) score -= 22;
  else if (download >= 10) score -= 28;
  else score -= 35;

  if (upload >= 200) score -= 0;
  else if (upload >= 50) score -= 4;
  else if (upload >= 20) score -= 9;
  else if (upload >= 10) score -= 13;
  else if (upload >= 5) score -= 16;
  else score -= 20;

  if (ping < 5) score -= 0;
  else if (ping < 15) score -= 5;
  else if (ping < 30) score -= 10;
  else if (ping < 60) score -= 15;
  else if (ping < 100) score -= 20;
  else score -= 25;

  if (jitter < 2) score -= 0;
  else if (jitter < 5) score -= 2;
  else if (jitter < 10) score -= 5;
  else if (jitter < 20) score -= 8;
  else score -= 10;

  if (bufferbloat < 5) score -= 0;
  else if (bufferbloat < 30) score -= 2;
  else if (bufferbloat < 60) score -= 5;
  else if (bufferbloat < 200) score -= 8;
  else score -= 10;

  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

const GRADE_DESCRIPTIONS = {
  'A+': 'Exceptional connection. Handles 4K streaming, competitive gaming, and large uploads simultaneously.',
  A: 'Excellent connection. Well-suited for demanding workloads and real-time applications.',
  B: 'Good connection. Handles most tasks comfortably; occasional limitations under heavy load.',
  C: 'Average connection. Adequate for standard use; may struggle with 4K or real-time gaming.',
  D: 'Below average. Some tasks like HD streaming may be inconsistent.',
  F: 'Poor connection. Significant issues detected. Check router, ISP, or contact support.',
};

/**
 * Map a grade to a display colour (also used by the history table).
 * @param {string} grade
 * @returns {string}
 */
export function gradeColor(grade) {
  return (
    {
      'A+': COLORS.crystal,
      A: COLORS.emerald,
      B: '#6ee7b7',
      C: COLORS.amber,
      D: COLORS.orange,
      F: COLORS.rose,
    }[grade] || 'var(--text3)'
  );
}

/**
 * Rate bufferbloat (latency increase under load).
 * @param {number} delta milliseconds
 * @returns {{ grade: string, color: string, message: string }}
 */
function rateBufferbloat(delta) {
  if (delta < 5) return { grade: 'A', color: COLORS.crystal, message: `+${formatMs(delta)}ms — Excellent. Queue management is superb.` };
  if (delta < 30) return { grade: 'B', color: COLORS.emerald, message: `+${formatMs(delta)}ms — Good. Minimal impact on gaming & calls.` };
  if (delta < 60) return { grade: 'C', color: COLORS.amber, message: `+${formatMs(delta)}ms — Moderate. Calls may degrade while downloading.` };
  if (delta < 200) return { grade: 'D', color: COLORS.rose, message: `+${formatMs(delta)}ms — Poor. Router buffering is causing lag spikes.` };
  return { grade: 'F', color: COLORS.rose, message: `+${formatMs(delta)}ms — Critical. Severe bufferbloat. Consider SQM/QoS.` };
}

/* ───────────────────────── Connection fingerprint ───────────────────── */

/**
 * Heuristically classify the connection medium from the measured metrics.
 * @returns {{ type: string, icon: string, badge: string, description: string }}
 */
function fingerprintConnection() {
  const { download = 0, upload = 0, ping = 999, jitter = 99 } = state.results;
  const symmetry = upload > 0 ? upload / download : 0;

  if (jitter > 15 && ping > 40 && download < 150) {
    return { type: 'Mobile / 4G–5G', icon: ICONS.mobile, badge: 'info', description: 'High jitter and latency pattern matches mobile or wireless broadband.' };
  }
  if (ping > 400) {
    return { type: 'Satellite', icon: ICONS.satellite, badge: 'warn', description: 'Extremely high latency is characteristic of geostationary satellite links.' };
  }
  if (download < 30 && symmetry < 0.15 && ping > 20) {
    return { type: 'DSL / ADSL', icon: ICONS.dsl, badge: 'warn', description: 'Low speed and heavy asymmetry are typical of copper DSL connections.' };
  }
  if (symmetry < 0.25 && download > 30) {
    return { type: 'Cable (Coax)', icon: ICONS.cable, badge: 'ok', description: 'High download with limited upload is characteristic of DOCSIS cable.' };
  }
  if (symmetry >= 0.5 && download >= 100 && ping < 20) {
    return { type: 'Fiber (FTTH)', icon: ICONS.fiber, badge: 'good', description: 'Near-symmetric speeds and low latency are hallmarks of fiber-to-the-home.' };
  }
  if (download >= 100) {
    return { type: 'Broadband', icon: ICONS.broadband, badge: 'ok', description: 'Fast connection — likely fiber or modern cable infrastructure.' };
  }
  return { type: 'Broadband', icon: ICONS.broadband, badge: 'info', description: 'Connection type could not be fingerprinted conclusively.' };
}

/* ──────────────────────────── Insight cards ─────────────────────────── */

/**
 * Render a single insight card to an HTML string.
 * @param {Object} card
 * @returns {string}
 */
function insightCard({ icon, label, tipKey, value, unit, barPercent, barColor, badge, badgeText, description }) {
  const bar =
    barPercent != null
      ? `<div class="ic-bar"><div class="ic-fill" data-w="${barPercent}" style="background:${barColor || 'var(--crystal)'}"></div></div>`
      : '';
  const badgeHtml = badge ? `<div class="ic-badge ${badge}">${badgeText}</div>` : '';
  const tipAttr = tipKey ? ` data-tip="${tipKey}"` : '';
  return `<div class="insight-card glass"><span class="ic-icon">${icon}</span><div class="ic-label"${tipAttr}>${label}</div>${badgeHtml}<div class="ic-val">${value}</div><div class="ic-unit">${unit}</div>${bar}<div class="ic-desc">${description}</div></div>`;
}

/** Render all deep-diagnostic insight cards into the grid. @private */
function renderInsights() {
  const r = state.results;
  const grid = byId('insights-grid');

  const loss = r.packetLoss ?? 0;
  const lossBadge = loss === 0 ? 'good' : loss < 2 ? 'ok' : loss < 5 ? 'warn' : 'fail';
  const lossText = loss === 0 ? 'None detected' : loss < 2 ? 'Minimal' : loss < 5 ? 'Moderate' : 'High';

  const dns = r.dnsTime ?? null;
  const dnsBadge = dns == null ? 'info' : dns < 5 ? 'good' : dns < 20 ? 'ok' : dns < 60 ? 'warn' : 'bad';
  const dnsText = dns == null ? 'Cached' : dns < 5 ? 'Excellent' : dns < 20 ? 'Good' : dns < 60 ? 'Slow' : 'Very slow';

  const tcp = r.tcpTime ?? null;
  const tcpBadge = tcp == null ? 'info' : tcp < 10 ? 'good' : tcp < 30 ? 'ok' : tcp < 80 ? 'warn' : 'bad';
  const tcpText = tcp == null ? 'Cached' : tcp < 10 ? 'Excellent' : tcp < 30 ? 'Good' : tcp < 80 ? 'Slow' : 'Very slow';

  const ttfb = r.ttfb ?? null;
  const ttfbBadge = ttfb == null ? 'info' : ttfb < 20 ? 'good' : ttfb < 60 ? 'ok' : ttfb < 200 ? 'warn' : 'bad';
  const ttfbText = ttfb == null ? 'N/A' : ttfb < 20 ? 'Excellent' : ttfb < 60 ? 'Good' : ttfb < 200 ? 'Slow' : 'Very slow';

  const download = r.download ?? 0;
  const upload = r.upload ?? 0;
  const symmetry = download > 0 ? (upload / download) * 100 : 0;
  const symBadge = symmetry >= 80 ? 'good' : symmetry >= 50 ? 'ok' : symmetry >= 25 ? 'info' : 'warn';
  const symText = symmetry >= 80 ? 'Symmetric' : symmetry >= 50 ? 'Near-symmetric' : symmetry >= 25 ? 'Asymmetric' : 'Highly asymmetric';

  const fingerprint = fingerprintConnection();

  const peak = r.peakDownload ?? 0;
  const peakRatio = download > 0 ? peak / download : 1;
  const peakBadge = peakRatio < 1.2 ? 'good' : peakRatio < 1.8 ? 'ok' : 'warn';
  const peakText = peakRatio < 1.2 ? 'Stable burst' : peakRatio < 1.8 ? 'Mild burst' : 'High burst variance';

  const tls = r.tlsTime ?? null;
  const tlsBadge = tls == null ? 'info' : tls < 20 ? 'good' : tls < 60 ? 'ok' : tls < 150 ? 'warn' : 'bad';
  const tlsText = tls == null ? 'Resumed' : tls < 20 ? 'Excellent' : tls < 60 ? 'Good' : tls < 150 ? 'Slow' : 'Very slow';

  grid.innerHTML = [
    insightCard({
      icon: ICONS.packetLoss, label: 'Packet Loss', tipKey: 'packetLoss', badge: lossBadge, badgeText: lossText,
      value: loss.toFixed(1), unit: '%  (of 12 probe packets)',
      barPercent: Math.min(loss * 10, 100),
      barColor: loss === 0 ? COLORS.crystal : loss < 5 ? COLORS.amber : COLORS.rose,
      description: loss === 0
        ? 'No packets dropped. Your connection reliably delivers all data.'
        : `${loss.toFixed(0)}% packet loss detected. Causes retransmissions that slow TCP and disrupt real-time streams.`,
    }),
    insightCard({
      icon: ICONS.dns, label: 'DNS Lookup Time', tipKey: 'dns', badge: dnsBadge, badgeText: dnsText,
      value: dns != null ? formatMs(dns) : '< 1', unit: 'ms  (domain resolution)',
      barPercent: dns != null ? Math.min((dns / 200) * 100, 100) : 2,
      barColor: dns == null || dns < 20 ? COLORS.crystal : dns < 60 ? COLORS.amber : COLORS.rose,
      description: dns != null && dns > 0
        ? `Resolver took ${formatMs(dns)}ms. Switch to 1.1.1.1 or 8.8.8.8 if consistently above 30ms.`
        : 'DNS was cached by your browser or OS — lookup time was negligible.',
    }),
    insightCard({
      icon: ICONS.tcp, label: 'TCP Handshake', tipKey: 'tcp', badge: tcpBadge, badgeText: tcpText,
      value: tcp != null ? formatMs(tcp) : '< 1', unit: 'ms  (SYN → SYN-ACK → ACK)',
      barPercent: tcp != null ? Math.min((tcp / 200) * 100, 100) : 2,
      barColor: tcp == null || tcp < 30 ? COLORS.crystal : tcp < 80 ? COLORS.amber : COLORS.rose,
      description: tcp != null && tcp > 0
        ? `TCP established in ${formatMs(tcp)}ms — reflects round-trip to the Cloudflare edge. Below 10ms means a very nearby POP.`
        : 'Connection was reused — no new handshake occurred.',
    }),
    insightCard({
      icon: ICONS.ttfb, label: 'Time to First Byte', tipKey: 'ttfb', badge: ttfbBadge, badgeText: ttfbText,
      value: ttfb != null ? formatMs(ttfb) : '—', unit: 'ms  (server + routing)',
      barPercent: ttfb != null ? Math.min((ttfb / 500) * 100, 100) : 0,
      barColor: ttfb == null || ttfb < 60 ? COLORS.crystal : ttfb < 200 ? COLORS.amber : COLORS.rose,
      description: ttfb != null
        ? `Server responded in ${formatMs(ttfb)}ms. Combines edge latency and server queuing. Under 60ms is excellent.`
        : 'TTFB not available — browser may have restricted cross-origin timing.',
    }),
    insightCard({
      icon: ICONS.symmetry, label: 'Upload / Download Symmetry', tipKey: 'symmetry', badge: symBadge, badgeText: symText,
      value: symmetry.toFixed(0), unit: `%  (${formatSpeed(upload)} ↑ vs ${formatSpeed(download)} ↓)`,
      barPercent: Math.min(symmetry, 100),
      barColor: symmetry >= 80 ? COLORS.crystal : symmetry >= 50 ? COLORS.emerald : symmetry >= 25 ? COLORS.amber : COLORS.rose,
      description: symmetry >= 80
        ? 'Symmetric. Fiber or enterprise link — uploads as fast as downloads.'
        : symmetry >= 50 ? 'Near-symmetric. Great for video calls and content creation.'
        : symmetry >= 25 ? 'Asymmetric. Typical of cable (DOCSIS). Fine for most home use.'
        : 'Highly asymmetric. Uploading large files will be slow.',
    }),
    insightCard({
      icon: fingerprint.icon, label: 'Connection Type (Fingerprint)', tipKey: 'fingerprint', badge: fingerprint.badge,
      badgeText: fingerprint.type, value: fingerprint.type, unit: 'estimated from measured metrics',
      barPercent: null, description: fingerprint.description,
    }),
    insightCard({
      icon: ICONS.peakBurst, label: 'Peak Burst Speed', tipKey: 'peakBurst', badge: peakBadge, badgeText: peakText,
      value: formatSpeed(peak), unit: `Mbps  (vs ${formatSpeed(download)} sustained)`,
      barPercent: download > 0 ? Math.min((peak / (download * 2)) * 100, 100) : 0,
      barColor: peakRatio < 1.5 ? COLORS.crystal : COLORS.amber,
      description: `Peak was ${peakRatio.toFixed(1)}× the sustained average. A large ratio means brief bursts but no sustained high speed — common on congested cable nodes.`,
    }),
    insightCard({
      icon: ICONS.tls, label: 'TLS Handshake', tipKey: 'tls', badge: tlsBadge, badgeText: tlsText,
      value: tls != null && tls > 0 ? formatMs(tls) : '< 1', unit: 'ms  (TLS 1.3 negotiation)',
      barPercent: tls != null ? Math.min((tls / 300) * 100, 100) : 1,
      barColor: tls == null || tls < 60 ? COLORS.crystal : tls < 150 ? COLORS.amber : COLORS.rose,
      description: tls != null && tls > 0
        ? `TLS negotiated in ${formatMs(tls)}ms. Modern TLS 1.3 needs a single round-trip.`
        : 'TLS session resumed from cache — no full negotiation.',
    }),
  ].join('');

  // Animate the bars in after the cards mount.
  setTimeout(() => {
    grid.querySelectorAll('.ic-fill[data-w]').forEach((el) => {
      el.style.width = `${el.dataset.w}%`;
    });
  }, 150);
}

/* ─────────────────────── Use-case compatibility ─────────────────────── */

/**
 * Real-world activities scored against the measured connection.
 * `ok`/`warn` are predicates over the results; `reason` explains a miss.
 */
const USE_CASES = [
  { icon: ICONS.gaming,       tipKey: 'compGaming',   name: 'Competitive Gaming',  requirement: '< 20ms ping\n< 3ms jitter',    ok: (r) => r.ping < 20 && r.jitter < 3,                            warn: (r) => r.ping < 40 && r.jitter < 10,              reason: (r) => (r.ping >= 20 ? `Ping ${formatMs(r.ping)}ms (need < 20ms)` : `Jitter ${formatMs(r.jitter)}ms (need < 3ms)`) },
  { icon: ICONS.casualGaming, tipKey: 'casualGaming', name: 'Casual Gaming',       requirement: '< 50ms ping\n< 10ms jitter',  ok: (r) => r.ping < 50 && r.jitter < 10,                           warn: (r) => r.ping < 80 && r.jitter < 20,              reason: (r) => `Ping ${formatMs(r.ping)}ms` },
  { icon: ICONS.streaming4k,  tipKey: 'streaming4k',  name: '4K HDR Streaming',    requirement: '25+ Mbps down',                ok: (r) => r.download >= 25,                                        warn: (r) => r.download >= 15,                          reason: (r) => `Need 25 Mbps, have ${formatSpeed(r.download)}` },
  { icon: ICONS.streaming8k,  tipKey: 'streaming8k',  name: '8K Streaming',        requirement: '100+ Mbps down',               ok: (r) => r.download >= 100,                                       warn: (r) => r.download >= 60,                          reason: (r) => `Need 100 Mbps, have ${formatSpeed(r.download)}` },
  { icon: ICONS.videoCall,    tipKey: 'videoCall',    name: '4K Video Calls',      requirement: '8+ Mbps up/down\n< 30ms ping', ok: (r) => r.download >= 8 && r.upload >= 8 && r.ping < 30,       warn: (r) => r.download >= 5 && r.upload >= 5 && r.ping < 60, reason: (r) => (r.ping >= 30 ? `Latency ${formatMs(r.ping)}ms (need < 30ms)` : r.upload < 8 ? `Upload ${formatSpeed(r.upload)} Mbps (need 8+)` : `Download ${formatSpeed(r.download)} Mbps (need 8+)`) },
  { icon: ICONS.remoteWork,   tipKey: 'remoteWork',   name: 'Remote Work',         requirement: '10+ Mbps down\n5+ Mbps up',   ok: (r) => r.download >= 10 && r.upload >= 5,                       warn: (r) => r.download >= 5 && r.upload >= 2,          reason: (r) => (r.upload < 5 ? `Upload ${formatSpeed(r.upload)} Mbps (need 5+)` : `Download ${formatSpeed(r.download)} Mbps`) },
  { icon: ICONS.fileTransfer, tipKey: 'fileTransfer', name: 'Large File Transfer', requirement: '100+ Mbps down\n50+ Mbps up',  ok: (r) => r.download >= 100 && r.upload >= 50,                    warn: (r) => r.download >= 40 && r.upload >= 20,        reason: (r) => (r.upload < 50 ? `Upload ${formatSpeed(r.upload)} Mbps (need 50+)` : `Download ${formatSpeed(r.download)} Mbps`) },
  { icon: ICONS.smartHome,    tipKey: 'smartHome',    name: 'Smart Home / IoT',    requirement: '5+ Mbps down\nlow ping',       ok: (r) => r.download >= 5 && r.ping < 80,                         warn: (r) => r.download >= 2,                           reason: (r) => `Download ${formatSpeed(r.download)} Mbps` },
];

/** Render the use-case compatibility cards. @private */
function renderUseCases() {
  const grid = byId('usecase-grid');
  const r = state.results;

  grid.innerHTML = USE_CASES.map((useCase) => {
    const hasData = Boolean(r.download);
    const isOk = hasData && useCase.ok(r);
    const isWarn = !isOk && hasData && useCase.warn(r);
    const cssClass = isOk ? 'uc-ok' : isWarn ? 'uc-warn' : 'uc-fail';
    const status = isOk ? 'Supported' : isWarn ? 'Marginal' : 'Not Supported';
    const limiter = !isOk && hasData ? `<div class="uc-limiter">${useCase.reason(r)}</div>` : '';
    const tipAttr = useCase.tipKey ? ` data-tip="${useCase.tipKey}"` : '';
    return `<div class="uc-card glass ${cssClass}"><span class="uc-icon">${useCase.icon}</span><div class="uc-name"${tipAttr}>${useCase.name}</div><div class="uc-req">${useCase.requirement.replace(/\n/g, '<br>')}</div><div class="uc-status"><div class="uc-dot"></div>${status}</div>${limiter}</div>`;
  }).join('');
}

/* ───────────────────────────── Orchestration ────────────────────────── */

/**
 * Populate the analysis, insights and use-case sections from the latest
 * results, then reveal them. Writes the computed grade back into the results.
 */
export function showAnalysis() {
  const grade = calculateGrade();
  state.results.grade = grade;

  const gradeBadge = byId('grade-badge');
  gradeBadge.textContent = grade;
  gradeBadge.className = `grade-big ${grade.replace('+', 'p')}`;
  setText('grade-desc', GRADE_DESCRIPTIONS[grade] || '');

  const bufferbloat = state.results.bufferbloat ?? 0;
  const bbInfo = rateBufferbloat(bufferbloat);
  const bbBadge = byId('bb-badge');
  bbBadge.textContent = bbInfo.grade;
  bbBadge.className = `grade-big ${bbInfo.grade}`;
  bbBadge.style.color = bbInfo.color;
  setText('bb-desc', bbInfo.message);
  const bbFill = byId('bb-fill');
  bbFill.style.background = bbInfo.color;
  setTimeout(() => {
    bbFill.style.width = `${Math.min((bufferbloat / 200) * 100, 100)}%`;
  }, 100);

  const consistency = state.results.consistency ?? 0;
  setText('consist-val', consistency.toFixed(0));
  setText(
    'consist-desc',
    consistency >= 90 ? 'Very stable — your speeds barely fluctuated during the test.'
      : consistency >= 75 ? 'Reasonably stable with minor variations.'
      : consistency >= 55 ? 'Moderate fluctuations detected — network may be congested.'
      : 'High variability. Consider checking for interference or congestion.',
  );

  renderUseCases();
  renderInsights();

  setTimeout(() => {
    byId('analysis').classList.add('visible');
    byId('insights').classList.add('visible');
    byId('usecases').classList.add('visible');
    byId('share-row').classList.add('visible');
  }, 200);
}
