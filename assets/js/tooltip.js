/**
 * Lightweight tooltip system.
 *
 * Usage: add `data-tip="key"` to any element. On hover a floating card
 * appears showing a short description and a Wikipedia link.
 *
 * @module tooltip
 */

/**
 * @typedef {Object} TipEntry
 * @property {string} title     Display name shown in the tooltip header.
 * @property {string} desc      One or two sentence explanation.
 * @property {string} wiki      Full Wikipedia article URL.
 */

/** @type {Record<string, TipEntry>} */
export const TIPS = {
  /* ── Hero metric chips ────────────────────────────────────────────── */
  ping: {
    title: 'Ping (Latency)',
    desc: 'The round-trip time for a packet to travel from your device to a server and back. Lower is better — under 20 ms is excellent for gaming, under 60 ms is fine for video calls.',
    wiki: 'https://en.wikipedia.org/wiki/Ping_(networking_utility)',
  },
  jitter: {
    title: 'Jitter',
    desc: 'The variation in consecutive ping measurements. High jitter causes choppy voice and video calls even when average latency looks fine. Under 5 ms is ideal.',
    wiki: 'https://en.wikipedia.org/wiki/Jitter#Packet_jitter_in_computer_networks',
  },
  download: {
    title: 'Download Speed',
    desc: 'How fast data travels from the internet to your device, measured in Megabits per second (Mbps). This determines streaming quality, file-download times and page load speed.',
    wiki: 'https://en.wikipedia.org/wiki/Bandwidth_(computing)',
  },
  upload: {
    title: 'Upload Speed',
    desc: 'How fast data leaves your device toward the internet. Critical for video calls, cloud backups and sharing large files. Often much lower than download on cable connections.',
    wiki: 'https://en.wikipedia.org/wiki/Upload_and_download',
  },

  /* ── Analysis section ─────────────────────────────────────────────── */
  grade: {
    title: 'Connection Grade',
    desc: 'An overall A+–F score computed from a weighted combination of download, upload, latency, jitter and bufferbloat. A single weak metric can bring the grade down.',
    wiki: 'https://en.wikipedia.org/wiki/Internet_access#Metrics',
  },
  bufferbloat: {
    title: 'Bufferbloat',
    desc: 'The extra latency added when your router\'s buffer fills up under heavy load. Even a fast connection can have severe bufferbloat, causing lag spikes during downloads.',
    wiki: 'https://en.wikipedia.org/wiki/Bufferbloat',
  },
  consistency: {
    title: 'Speed Consistency',
    desc: 'How stable your throughput was throughout the download test. A low score means speeds fluctuated heavily — common on congested or wireless links.',
    wiki: 'https://en.wikipedia.org/wiki/Network_congestion',
  },

  /* ── Deep diagnostics ─────────────────────────────────────────────── */
  packetLoss: {
    title: 'Packet Loss',
    desc: 'The percentage of data packets that never arrive. Even 1–2% loss causes TCP to retransmit data and dramatically cuts effective throughput.',
    wiki: 'https://en.wikipedia.org/wiki/Packet_loss',
  },
  dns: {
    title: 'DNS Lookup Time',
    desc: 'Time to resolve a domain name to an IP address. Every new connection starts with a DNS query — slow DNS adds visible delay to every page you visit.',
    wiki: 'https://en.wikipedia.org/wiki/Domain_Name_System',
  },
  tcp: {
    title: 'TCP Handshake',
    desc: 'The three-way SYN/SYN-ACK/ACK exchange that opens every TCP connection. Its duration reflects the physical round-trip distance to the nearest server.',
    wiki: 'https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment',
  },
  ttfb: {
    title: 'Time to First Byte (TTFB)',
    desc: 'Time from sending an HTTP request to receiving the first byte of the response. Combines TCP handshake, server processing time and network propagation delay.',
    wiki: 'https://en.wikipedia.org/wiki/Time_to_first_byte',
  },
  symmetry: {
    title: 'Upload / Download Symmetry',
    desc: 'The ratio of upload speed to download speed. Fiber connections are often symmetric (1:1). Cable (DOCSIS) is typically heavily asymmetric — 5–20% upload vs download.',
    wiki: 'https://en.wikipedia.org/wiki/Asymmetric_digital_subscriber_line',
  },
  fingerprint: {
    title: 'Connection Fingerprint',
    desc: 'A heuristic estimate of your physical link type (Fiber, Cable, DSL, Mobile, Satellite) based on the pattern of speed, latency and symmetry observed during the test.',
    wiki: 'https://en.wikipedia.org/wiki/Broadband#Types',
  },
  peakBurst: {
    title: 'Peak Burst Speed',
    desc: 'The highest instantaneous speed measured during the test, vs the sustained average. A high ratio indicates "turbo burst" mode — short-lived bursts that inflate advertised speeds.',
    wiki: 'https://en.wikipedia.org/wiki/Burst_transmission',
  },
  tls: {
    title: 'TLS Handshake',
    desc: 'The cryptographic negotiation that secures an HTTPS connection. TLS 1.3 reduces this to a single round-trip. A resumed session adds near-zero overhead.',
    wiki: 'https://en.wikipedia.org/wiki/Transport_Layer_Security',
  },

  /* ── Use-case cards ───────────────────────────────────────────────── */
  compGaming: {
    title: 'Competitive Gaming',
    desc: 'Fast-paced online games (FPS, battle royale) need sub-20 ms ping and near-zero jitter. Even a few milliseconds of jitter can cause hit registration to fail.',
    wiki: 'https://en.wikipedia.org/wiki/Ping_(video_games)',
  },
  casualGaming: {
    title: 'Casual Gaming',
    desc: 'Slower-paced online games tolerate higher latency. Under 50 ms ping is generally imperceptible, though lag spikes above 100 ms become noticeable.',
    wiki: 'https://en.wikipedia.org/wiki/Lag_(video_games)',
  },
  streaming4k: {
    title: '4K HDR Streaming',
    desc: 'Streaming 4K HDR video (Netflix, Disney+, YouTube) requires a sustained 25 Mbps or more. Bufferbloat and congestion can cause mid-stream quality drops.',
    wiki: 'https://en.wikipedia.org/wiki/4K_resolution',
  },
  streaming8k: {
    title: '8K Streaming',
    desc: '8K video at 60 fps requires 80–100 Mbps sustained. Currently only YouTube and a handful of services offer 8K content.',
    wiki: 'https://en.wikipedia.org/wiki/8K_resolution',
  },
  videoCall: {
    title: '4K Video Calls',
    desc: 'High-resolution video conferencing (Zoom, Meet, Teams) needs symmetric bandwidth of at least 8 Mbps and low ping. Jitter and packet loss are more disruptive than raw speed.',
    wiki: 'https://en.wikipedia.org/wiki/Videotelephony',
  },
  remoteWork: {
    title: 'Remote Work',
    desc: 'Day-to-day remote work (VPN, cloud apps, video calls) needs at least 10 Mbps down and 5 Mbps up. VPN tunnels add latency, so low ping helps.',
    wiki: 'https://en.wikipedia.org/wiki/Remote_work',
  },
  fileTransfer: {
    title: 'Large File Transfer',
    desc: 'Moving multi-GB files to cloud storage or colleagues requires high upload speed. A 1 GB file takes ~2 min at 50 Mbps upload but 13 min at 10 Mbps.',
    wiki: 'https://en.wikipedia.org/wiki/File_transfer',
  },
  smartHome: {
    title: 'Smart Home / IoT',
    desc: 'Smart speakers, cameras and sensors need modest bandwidth but many simultaneous connections. Low ping helps responsive devices like voice assistants feel instant.',
    wiki: 'https://en.wikipedia.org/wiki/Internet_of_things',
  },
};

/* ─────────────────────────── Tooltip DOM ────────────────────────────── */

let tipEl = null;
let hideTimer = null;

/** Create the singleton tooltip element once. */
function ensureTipEl() {
  if (tipEl) return;
  tipEl = document.createElement('div');
  tipEl.className = 'sp-tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.innerHTML = '<div class="sp-tip-inner"></div>';
  document.body.appendChild(tipEl);

  // Keep tooltip alive when the cursor moves onto it.
  tipEl.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  tipEl.addEventListener('mouseleave', hideTip);
}

/** Show the tooltip anchored below/above `anchor` with content from `key`. */
function showTip(anchor, key) {
  const entry = TIPS[key];
  if (!entry) return;
  ensureTipEl();
  clearTimeout(hideTimer);

  tipEl.querySelector('.sp-tip-inner').innerHTML =
    `<div class="sp-tip-title">${entry.title}</div>` +
    `<div class="sp-tip-desc">${entry.desc}</div>` +
    `<a class="sp-tip-link" href="${entry.wiki}" target="_blank" rel="noopener noreferrer">` +
    `Wikipedia →</a>`;

  // Position: prefer below anchor, flip to above if it clips the viewport.
  tipEl.style.cssText = 'opacity:0;visibility:visible;pointer-events:auto;';
  const rect = anchor.getBoundingClientRect();
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const tw = Math.min(300, sw - 24);
  tipEl.style.width = tw + 'px';

  const scrollY = window.scrollY;
  let top = rect.bottom + scrollY + 10;
  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(12, Math.min(left, sw - tw - 12));

  // Flip above if not enough space below.
  if (rect.bottom + 180 > sh) top = rect.top + scrollY - 180;

  tipEl.style.top = top + 'px';
  tipEl.style.left = left + 'px';

  requestAnimationFrame(() => { tipEl.style.opacity = '1'; });
}

function hideTip() {
  hideTimer = setTimeout(() => {
    if (tipEl) tipEl.style.cssText = 'opacity:0;visibility:hidden;pointer-events:none;';
  }, 120);
}

/* ─────────────────────────── Public init ────────────────────────────── */

/**
 * Attach hover listeners to every `[data-tip]` element currently in the DOM,
 * and wire a MutationObserver so dynamically-rendered cards are also covered.
 */
export function initTooltips() {
  ensureTipEl();

  function attach(root) {
    root.querySelectorAll('[data-tip]').forEach((el) => {
      if (el._tipBound) return;
      el._tipBound = true;
      el.addEventListener('mouseenter', () => showTip(el, el.dataset.tip));
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('focusin',    () => showTip(el, el.dataset.tip));
      el.addEventListener('focusout',   hideTip);
    });
  }

  attach(document);

  // Re-scan when analysis cards are rendered dynamically.
  new MutationObserver(() => attach(document)).observe(document.body, {
    childList: true,
    subtree: true,
  });
}
