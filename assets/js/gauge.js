/**
 * Animated circular speed gauge rendered on a canvas.
 *
 * The gauge maps throughput to a logarithmic arc so that both slow (1 Mbps)
 * and fast (1 Gbps) connections are legible. It eases the displayed value
 * toward a target each frame for a smooth needle-free animation.
 *
 * @module gauge
 */

import { COLORS } from './config.js';

/** Arc geometry, in radians. The gauge spans 270°. */
const ARC_START = Math.PI * 0.75;
const ARC_END = Math.PI * 2.25;
const ARC_SWEEP = ARC_END - ARC_START;

/** Logarithmic scale ceiling (Mbps). */
const SCALE_MAX = 1000;

/** Tick marks (Mbps) and the subset rendered as labelled major ticks. */
const TICKS = [0, 5, 10, 25, 50, 100, 250, 500, 1000];
const MAJOR_TICKS = new Set([0, 10, 50, 100, 1000]);

export class Gauge {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    /** @private */ this.canvas = canvas;
    /** @private */ this.ctx = canvas.getContext('2d');
    /** @private */ this.dpr = window.devicePixelRatio || 1;
    /** @private Current eased value shown on screen. */ this.displayValue = 0;
    /** @private Value the gauge is easing toward. */ this.targetValue = 0;
    /** @private @type {'idle'|'ping'|'download'|'upload'|'complete'} */ this.phase = 'idle';

    this.#render();
  }

  /**
   * Set the value the gauge should animate toward.
   * @param {number} value Mbps
   */
  setValue(value) {
    this.targetValue = Math.max(0, value);
  }

  /**
   * Set the current test phase (drives the accent colour).
   * @param {'idle'|'ping'|'download'|'upload'|'complete'} phase
   */
  setPhase(phase) {
    this.phase = phase;
  }

  /** Map a Mbps value to a 0–1 position along the arc. @private */
  #logPosition(value) {
    if (value <= 0) return 0;
    return Math.log10(value + 1) / Math.log10(SCALE_MAX + 1);
  }

  /** Accent colour for the current phase. @private */
  #phaseColor() {
    switch (this.phase) {
      case 'ping': return COLORS.ice;
      case 'download': return COLORS.crystal;
      case 'upload': return COLORS.aurora;
      case 'complete': return COLORS.emerald;
      default: return '#5b6b8c';
    }
  }

  /** Resize the backing store to match the CSS size at the device pixel ratio. @private */
  #syncSize(cssWidth, cssHeight) {
    const targetW = cssWidth * this.dpr;
    const targetH = cssHeight * this.dpr;
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
  }

  /** Per-frame render loop. @private */
  #render() {
    // Ease the display value toward the target.
    this.displayValue += (this.targetValue - this.displayValue) * 0.06;
    if (Math.abs(this.targetValue - this.displayValue) < 0.01) {
      this.displayValue = this.targetValue;
    }

    const cssW = this.canvas.offsetWidth || 400;
    const cssH = this.canvas.offsetHeight || 400;
    this.#syncSize(cssW, cssH);

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    const cx = cssW * 0.5;
    const cy = cssH * 0.52;
    const radius = Math.min(cssW, cssH) * 0.36;

    this.#drawOuterRing(ctx, cx, cy, radius);
    this.#drawTrack(ctx, cx, cy, radius);
    this.#drawTicks(ctx, cx, cy, radius);
    this.#drawProgress(ctx, cx, cy, radius);
    this.#drawValue(ctx, cx, cy, radius);

    ctx.restore();
    requestAnimationFrame(() => this.#render());
  }

  /** @private */
  #drawOuterRing(ctx, cx, cy, radius) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 16, ARC_START, ARC_END);
    ctx.strokeStyle = 'rgba(120,170,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** @private */
  #drawTrack(ctx, cx, cy, radius) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, ARC_START, ARC_END);
    ctx.strokeStyle = COLORS.track;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  /** @private */
  #drawTicks(ctx, cx, cy, radius) {
    for (const value of TICKS) {
      const angle = ARC_START + ARC_SWEEP * this.#logPosition(value);
      const isMajor = MAJOR_TICKS.has(value);
      const inner = radius - (isMajor ? 13 : 8);
      const outer = radius + (isMajor ? 6 : 3);

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.strokeStyle = isMajor ? COLORS.tickMajor : COLORS.tickMinor;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (isMajor) {
        const labelRadius = radius + 24;
        ctx.fillStyle = COLORS.label;
        ctx.font = `500 ${radius * 0.1}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          value === 1000 ? '1K' : String(value),
          cx + Math.cos(angle) * labelRadius,
          cy + Math.sin(angle) * labelRadius,
        );
      }
    }
  }

  /** @private */
  #drawProgress(ctx, cx, cy, radius) {
    const progress = this.#logPosition(this.displayValue);
    if (progress <= 0.002) return;

    const tipAngle = ARC_START + ARC_SWEEP * progress;
    const accent = this.#phaseColor();

    const gradient = ctx.createLinearGradient(
      cx + Math.cos(ARC_START) * radius, cy + Math.sin(ARC_START) * radius,
      cx + Math.cos(ARC_END) * radius, cy + Math.sin(ARC_END) * radius,
    );
    gradient.addColorStop(0, COLORS.deep);
    gradient.addColorStop(0.45, COLORS.crystal);
    gradient.addColorStop(1, COLORS.ice);

    // Soft glow underlay.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, ARC_START, tipAngle);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.restore();

    // Main gradient arc.
    ctx.beginPath();
    ctx.arc(cx, cy, radius, ARC_START, tipAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glowing tip.
    const tx = cx + Math.cos(tipAngle) * radius;
    const ty = cy + Math.sin(tipAngle) * radius;
    const tipGlow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 20);
    tipGlow.addColorStop(0, `${accent}cc`);
    tipGlow.addColorStop(1, `${accent}00`);
    ctx.beginPath();
    ctx.arc(tx, ty, 20, 0, Math.PI * 2);
    ctx.fillStyle = tipGlow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx, ty, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx, ty, 3, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  }

  /** @private */
  #drawValue(ctx, cx, cy, radius) {
    const value = this.displayValue;
    const text = value < 0.5 ? '—' : value < 10 ? value.toFixed(1) : String(Math.round(value));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const valueGradient = ctx.createLinearGradient(cx, cy - radius * 0.4, cx, cy + radius * 0.2);
    valueGradient.addColorStop(0, '#ffffff');
    valueGradient.addColorStop(1, '#cfe6ff');
    ctx.fillStyle = valueGradient;
    ctx.font = `700 ${radius * 0.46}px 'Sora', sans-serif`;
    ctx.fillText(text, cx, cy - radius * 0.04);

    ctx.fillStyle = 'rgba(165,243,252,0.45)';
    ctx.font = `400 ${radius * 0.13}px 'JetBrains Mono', monospace`;
    ctx.fillText('Mbps', cx, cy + radius * 0.3);
  }
}
