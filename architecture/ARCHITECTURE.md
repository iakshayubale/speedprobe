# SpeedProbe — Architecture

A technical reference for how SpeedProbe is structured, how data flows, and how the modules relate to each other.

---

## 1. High-Level Overview

SpeedProbe is a **zero-build, zero-dependency** web application. Everything runs client-side. There is no backend, no server-side rendering and no bundler. The browser loads `index.html`, which boots `assets/js/app.js` as a native ES module, and the app self-assembles from there.

All measurement traffic goes to **Cloudflare's public speed-test infrastructure** only. Two Cloudflare endpoints are also used for ISP / location detection. No third-party analytics or tracking services are contacted.

```mermaid
flowchart TD
    Browser["Browser\n(index.html)"]

    subgraph CF ["☁️  Cloudflare Infrastructure"]
        DOWN["speed.cloudflare.com/__down\nLatency · Download · ISP headers"]
        UP["speed.cloudflare.com/__up\nUpload"]
        TRACE["cloudflare.com/cdn-cgi/trace\nIP · Datacenter · Country"]
        AIM["aim.cloudflare.com/__log\nAnonymised result logging\n(SDK-managed, no personal data)"]
    end

    subgraph Store ["💾  Browser Storage"]
        LS["localStorage\nTest history (last 10 results)"]
    end

    Browser -->|"fetch (latency + download)"| DOWN
    Browser -->|"fetch (upload)"| UP
    Browser -->|"fetch (ISP detection)"| TRACE
    Browser -->|"fetch (ISP header enrichment)"| DOWN
    Browser -.->|"SDK sends on finish"| AIM
    Browser <-->|"read / write"| LS
```

> The dashed arrow to `aim.cloudflare.com` is managed entirely by the Cloudflare SDK on test completion. It transmits only anonymised speed samples — no IP address, no browser fingerprint and no personal data. See [Cloudflare AIM docs](https://developers.cloudflare.com/fundamentals/speed/aim/).

---

## 2. Module Map

```mermaid
flowchart TD
    HTML["index.html\n&lt;script type=module src=app.js&gt;"]

    subgraph Entry ["Entry Point"]
        APP["app.js\nOrchestrates lifecycle,\nwires all events"]
    end

    subgraph Core ["Core Logic"]
        MEAS["measurements.js\nRuns the speed test\nvia Cloudflare SDK"]
        ANAL["analysis.js\nGrades the connection,\ngenerates insight cards\nand use-case verdicts"]
        ISP["isp.js\nDetects ISP, IP and\nlocation via Cloudflare"]
    end

    subgraph Visualisation ["Visualisation"]
        VIZ["viz.js\nOwns gauge + graph\nsingleton instances"]
        GAUGE["gauge.js\nAnimated speedometer\n&lt;canvas&gt;"]
        GRAPH["graph.js\nLive throughput/latency\n&lt;canvas&gt;"]
    end

    subgraph Persistence ["Persistence & Sharing"]
        HIST["history.js\nlocalStorage read/write,\nhistory table render"]
        SHARE["share.js\nWeb Share API +\nclipboard fallback"]
    end

    subgraph UI ["UI & Effects"]
        BG["background.js\nParticle field, cursor,\nscroll + reveal"]
        TIP["tooltip.js\nGlassmorphism hover tips\nfor 25 technical terms"]
    end

    subgraph Shared ["Shared Utilities"]
        CFG["config.js\nFrozen constants:\nendpoints, colours, keys"]
        STATE["state.js\nResettable run state\nfor the active test"]
        DOM["dom.js\nbyId, setText, tiny helpers"]
        UTILS["utils.js\nStats, formatting, polyfill"]
    end

    subgraph Vendor ["Vendor"]
        SDK["vendor/speedtest.js\n@cloudflare/speedtest v1.10.1\nMIT © 2023 Cloudflare"]
    end

    HTML --> APP
    APP --> MEAS
    APP --> ANAL
    APP --> ISP
    APP --> VIZ
    APP --> HIST
    APP --> SHARE
    APP --> BG
    APP --> TIP
    APP --> CFG
    APP --> STATE
    APP --> DOM

    MEAS --> SDK
    MEAS --> CFG
    MEAS --> STATE
    MEAS --> VIZ

    VIZ --> GAUGE
    VIZ --> GRAPH

    ANAL --> DOM
    ANAL --> UTILS
    ANAL --> TIP

    ISP --> CFG
    ISP --> DOM

    HIST --> CFG
    HIST --> DOM
    HIST --> UTILS

    SHARE --> DOM
    SHARE --> STATE

    MEAS --> DOM
    MEAS --> UTILS
```

---

## 3. Test Execution Sequence

This diagram traces a single run from the user pressing **START** to the history row being saved.

```mermaid
sequenceDiagram
    actor User
    participant App   as app.js
    participant Meas  as measurements.js
    participant SDK   as vendor/speedtest.js
    participant CF    as speed.cloudflare.com
    participant AIM   as aim.cloudflare.com
    participant Viz   as viz.js (gauge + graph)
    participant Anal  as analysis.js
    participant Hist  as history.js

    User->>App: click START
    App->>App: prepareRun() — reset state, clear UI
    App->>Meas: runMeasurements({ onPhase })

    Meas->>SDK: new SpeedTest({ autoStart: true })
    SDK->>CF: GET __down?bytes=0  (timing probe)
    CF-->>SDK: response headers (TTFB, TLS timing)

    note over SDK,CF: Latency phase
    loop ~20 RTT probes
        SDK->>CF: GET __down?bytes=0
        CF-->>SDK: pong
    end
    SDK->>Meas: onResultsChange (ping, jitter)
    Meas->>Viz: setMetricValue + gauge.setValue

    App->>App: onPhase("download") — switch gauge label

    note over SDK,CF: Download phase
    loop Ramp-up streams (1→6 parallel)
        SDK->>CF: GET __down?bytes=N
        CF-->>SDK: payload chunks
    end
    SDK->>Meas: onResultsChange (downloadBandwidth)
    Meas->>Viz: gauge.setValue + graph.push

    App->>App: onPhase("upload") — switch gauge label

    note over SDK,CF: Upload phase
    loop Ramp-up streams
        SDK->>CF: POST __up
        CF-->>SDK: ack
    end
    SDK->>Meas: onResultsChange (uploadBandwidth)
    Meas->>Viz: gauge.setValue + graph.push

    SDK->>Meas: onFinish (final results object)
    Meas->>AIM: POST __log  (anonymised, SDK-managed)
    Meas-->>App: Promise resolves with { ping, jitter, download, upload, … }

    App->>Anal: renderAnalysis(results)
    Anal->>App: grade, bufferbloat, consistency, insight cards

    App->>Hist: saveRun(results)
    Hist->>Hist: localStorage.setItem

    App->>App: finishTest() — re-enable START button
    App->>User: UI shows final results
```

---

## 4. ISP Detection Flow

ISP / location detection runs once at page load, in parallel with the visual boot sequence. It does not block or delay the speed test.

```mermaid
flowchart LR
    isp["isp.js\ndetectISP()"]

    subgraph parallel ["Promise.allSettled — both fire simultaneously"]
        T["fetch\ncloudflare.com/cdn-cgi/trace\n→ plain-text key=value"]
        M["fetch\nspeed.cloudflare.com/__down?bytes=0\n→ CORS response headers"]
    end

    isp --> T
    isp --> M

    T -->|"ip, colo (e.g. TXL),\nloc (e.g. DE)"| merge["Merge results"]
    M -->|"cf-meta-ip\ncf-meta-asn (if populated)\ncf-meta-city / country"| merge

    merge --> label{"Build label"}
    label -->|"cf-meta-asn present"| ISPName["ISP org name\ne.g. Vodafone DE"]
    label -->|"ASN absent (typical)"| ColoLoc["Datacenter · Country\ne.g. TXL · DE"]

    ISPName --> nav["Update nav bar\nisp-name · isp-ip · isp-loc"]
    ColoLoc --> nav
```

> Cloudflare exposes `cf-meta-asn` in their CORS `access-control-expose-headers` but does not populate the header value on all PoPs. When absent, the datacenter code + country from `cdn-cgi/trace` serves as the label instead.

---

## 5. File Structure

```
speedtest/
├── index.html                  ← Single HTML shell; all JS loaded as ES modules
├── package.json
├── LICENSE                     ← MIT — SpeedProbe contributors
├── CONTRIBUTING.md
│
├── LICENSES/                   ← Third-party license attributions
│   ├── cloudflare-speedtest-MIT.txt
│   ├── Sora-OFL.txt
│   └── JetBrainsMono-OFL.txt
│
├── architecture/               ← This document
│   └── ARCHITECTURE.md
│
└── assets/
    ├── css/
    │   └── styles.css          ← Design tokens, @font-face, all component styles
    │
    ├── fonts/                  ← Self-hosted Latin woff2 (no CDN calls)
    │   ├── Sora-{200…800}.woff2
    │   └── JetBrainsMono-{300…600}.woff2
    │
    └── js/
        ├── app.js              ← Entry point
        ├── config.js           ← Constants and endpoint URLs
        ├── state.js            ← Mutable run state
        ├── measurements.js     ← Speed-test orchestration (wraps SDK)
        ├── analysis.js         ← Grading, insights, use-case cards
        ├── isp.js              ← ISP / location detection
        ├── viz.js              ← Gauge + graph singletons
        ├── gauge.js            ← Speedometer canvas renderer
        ├── graph.js            ← Throughput/latency canvas renderer
        ├── background.js       ← Particles, cursor, scroll effects
        ├── tooltip.js          ← Hover tooltips for technical terms
        ├── history.js          ← localStorage persistence + table render
        ├── share.js            ← Web Share API + clipboard
        ├── dom.js              ← DOM micro-utilities
        ├── utils.js            ← Pure helpers (stats, formatting)
        └── vendor/
            └── speedtest.js    ← @cloudflare/speedtest v1.10.1 (MIT)
```

---

## 6. Privacy & Data Flow Summary

| Data | Where it stays | Sent externally? |
|---|---|---|
| Raw download/upload/latency samples | Browser memory only | Only anonymised aggregate → `aim.cloudflare.com` (SDK) |
| Test history | `localStorage` on your device | Never |
| Your IP address | Used locally for display only | Never (trace gives it but it stays in JS) |
| ISP / location info | Nav bar display only | Never |
| Fonts | Self-hosted in `assets/fonts/` | No CDN request |
| Analytics / ads | Not present | — |

The only data leaving the browser is the **Cloudflare SDK's anonymised result log** (measurement statistics with no identifying information) and the **measurement traffic itself** to `speed.cloudflare.com`.
