/**
 * Live throughput + latency line graph rendered on a canvas.
 *
 * Speed samples are drawn as a filled crystal-blue line; under-load latency
 * samples are overlaid as a dashed indigo line. Both axes auto-scale as new
 * samples arrive so bursts remain on-screen.
 *
 * @module graph
 */

import { COLORS } from './config.js';

/** Inner padding around the plot area. */
const PADDING = { top: 14, right: 16, bottom: 30, left: 52 };

/** Fixed CSS height of the graph. */
const HEIGHT = 170;

export class Graph {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    /** @private */ this.canvas = canvas;
    /** @private */ this.ctx = canvas.getContext('2d');
    /** @private */ this.dpr = window.devicePixelRatio || 1;
    /** @private @type {{ t: number, v: number }[]} */ this.speedSamples = [];
    /** @private @type {{ t: number, v: number }[]} */ this.latencySamples = [];
    /** @private */ this.maxSpeed = 50;
    /** @private */ this.maxLatency = 200;
    /** @private */ this.cssWidth = 0;
    /** @private */ this.cssHeight = HEIGHT;

    this.resize();
    this.#render();
  }

  /** Recompute the backing-store size from the parent width. */
  resize() {
    const width = this.canvas.parentElement?.offsetWidth || 800;
    this.cssWidth = width;
    this.cssHeight = HEIGHT;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${HEIGHT}px`;
    this.canvas.width = width * this.dpr;
    this.canvas.height = HEIGHT * this.dpr;
  }

  /**
   * Append a throughput sample.
   * @param {number} t timestamp (performance.now)
   * @param {number} v Mbps
   */
  addSpeed(t, v) {
    this.speedSamples.push({ t, v });
    if (v > this.maxSpeed * 0.88) this.maxSpeed = v * 1.35;
  }

  /**
   * Append an under-load latency sample.
   * @param {number} t timestamp (performance.now)
   * @param {number} v milliseconds
   */
  addLatency(t, v) {
    this.latencySamples.push({ t, v });
    if (v > this.maxLatency * 0.88) this.maxLatency = v * 1.35;
  }

  /** Clear all samples and reset the axes. */
  reset() {
    this.speedSamples = [];
    this.latencySamples = [];
    this.maxSpeed = 50;
    this.maxLatency = 200;
  }

  /** Per-frame render loop. @private */
  #render() {
    const { ctx, dpr, cssWidth: cw, cssHeight: ch } = this;
    const plotW = cw - PADDING.left - PADDING.right;
    const plotH = ch - PADDING.top - PADDING.bottom;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    this.#drawGridAndAxis(ctx, plotW, plotH);
    this.#drawSpeedLine(ctx, plotW, plotH);
    this.#drawLatencyLine(ctx, plotW, plotH);
    this.#drawElapsed(ctx, plotW, plotH);

    ctx.restore();
    requestAnimationFrame(() => this.#render());
  }

  /** @private */
  #drawGridAndAxis(ctx, plotW, plotH) {
    for (let i = 0; i <= 4; i++) {
      const y = PADDING.top + plotH * (1 - i / 4);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + plotW, y);
      ctx.strokeStyle = 'rgba(120,170,255,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(165,243,252,0.22)';
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String((this.maxSpeed * i) / 4 | 0), PADDING.left - 6, y);
    }
  }

  /**
   * Build x/y projection helpers for the current sample window.
   * @private
   */
  #projection(plotW, plotH, maxValue) {
    const first = this.speedSamples[0].t;
    const last = this.speedSamples[this.speedSamples.length - 1].t;
    const range = last - first || 1;
    return {
      toX: (t) => PADDING.left + plotW * ((t - first) / range),
      toY: (v) => PADDING.top + plotH * (1 - Math.min(v / maxValue, 1)),
      first,
    };
  }

  /** @private */
  #drawSpeedLine(ctx, plotW, plotH) {
    if (this.speedSamples.length <= 1) return;
    const { toX, toY, first } = this.#projection(plotW, plotH, this.maxSpeed);

    ctx.beginPath();
    this.speedSamples.forEach((p, i) => {
      const x = toX(p.t);
      const y = toY(p.v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = COLORS.crystal;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.shadowColor = COLORS.crystal;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill under the line.
    const lastX = toX(this.speedSamples[this.speedSamples.length - 1].t);
    ctx.lineTo(lastX, PADDING.top + plotH);
    ctx.lineTo(toX(first), PADDING.top + plotH);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + plotH);
    fill.addColorStop(0, 'rgba(56,189,248,0.22)');
    fill.addColorStop(1, 'rgba(56,189,248,0.01)');
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /** @private */
  #drawLatencyLine(ctx, plotW, plotH) {
    if (this.latencySamples.length <= 1 || this.speedSamples.length <= 1) return;
    const { toX, toY } = this.#projection(plotW, plotH, this.maxLatency);

    ctx.beginPath();
    this.latencySamples.forEach((p, i) => {
      const x = toX(p.t);
      const y = toY(p.v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(129,140,248,0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** @private */
  #drawElapsed(ctx, plotW, plotH) {
    if (this.speedSamples.length <= 1) return;
    const elapsed = (this.speedSamples[this.speedSamples.length - 1].t - this.speedSamples[0].t) / 1000;
    ctx.fillStyle = 'rgba(165,243,252,0.2)';
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${elapsed.toFixed(0)}s`, PADDING.left + plotW, PADDING.top + plotH + 6);
  }
}
