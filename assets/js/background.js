/**
 * Ambient page chrome: the crystal particle field, custom cursor, scroll
 * progress bar, sticky-nav state and scroll-reveal animations.
 *
 * All of this is purely decorative and self-contained — it never touches the
 * measurement logic.
 *
 * @module background
 */

import { byId, queryAll } from './dom.js';

/** Shared pointer position, used by the particle field and the cursor. */
const pointer = { x: 0, y: 0 };

/** Distance (px) within which particles connect and react to the pointer. */
const LINK_DISTANCE = 120;

/**
 * A single drifting, twinkling background particle.
 */
class Particle {
  /** @param {() => { width: number, height: number }} bounds */
  constructor(bounds) {
    this.bounds = bounds;
    this.reset();
  }

  reset() {
    const { width, height } = this.bounds();
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.25;
    this.vy = (Math.random() - 0.5) * 0.25;
    this.radius = Math.random() * 1.4 + 0.4;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.twinkle = Math.random() * Math.PI * 2;
  }

  step() {
    const { width, height } = this.bounds();
    this.x += this.vx;
    this.y += this.vy;
    this.twinkle += 0.02;

    // Gentle repulsion from the pointer.
    const dx = this.x - pointer.x;
    const dy = this.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance < LINK_DISTANCE) {
      const force = ((LINK_DISTANCE - distance) / LINK_DISTANCE) * 0.05;
      this.x += dx * force;
      this.y += dy * force;
    }

    // Wrap around the edges.
    if (this.x < -6) this.x = width + 6;
    if (this.x > width + 6) this.x = -6;
    if (this.y < -6) this.y = height + 6;
    if (this.y > height + 6) this.y = -6;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const alpha = this.alpha * (0.6 + 0.4 * Math.sin(this.twinkle));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(165,243,252,${alpha})`;
    ctx.fill();
  }
}

/** Initialise the particle field on the given canvas. */
function initParticles() {
  const canvas = byId('crystal-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  /** @type {Particle[]} */
  let particles = [];

  const bounds = () => ({ width, height });

  const spawn = () => {
    const count = Math.min(Math.floor((width * height) / 9000), 150);
    particles = Array.from({ length: count }, () => new Particle(bounds));
  };

  const resize = () => {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    spawn();
  };

  const renderFrame = () => {
    ctx.clearRect(0, 0, width, height);

    // Connection lines between nearby particles.
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance < LINK_DISTANCE) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(96,165,250,${(1 - distance / LINK_DISTANCE) * 0.09})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    for (const particle of particles) {
      particle.step();
      particle.draw(ctx);
    }
    requestAnimationFrame(renderFrame);
  };

  window.addEventListener('resize', resize);
  resize();
  renderFrame();
}

/** Initialise the custom cursor (dot + trailing ring). */
function initCursor() {
  const dot = byId('cur');
  const ring = byId('cur-ring');
  if (!dot || !ring) return;

  let ringX = 0;
  let ringY = 0;

  document.addEventListener('mousemove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    dot.style.left = `${pointer.x}px`;
    dot.style.top = `${pointer.y}px`;
  });

  const animateRing = () => {
    ringX += (pointer.x - ringX) * 0.12;
    ringY += (pointer.y - ringY) * 0.12;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(animateRing);
  };
  animateRing();

  for (const el of queryAll('a, button')) {
    el.addEventListener('mouseenter', () => document.body.classList.add('link-hovered'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('link-hovered'));
  }
}

/** Initialise the scroll progress bar and sticky-nav background. */
function initScroll() {
  const progress = byId('progress');
  const nav = byId('nav');

  window.addEventListener(
    'scroll',
    () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      if (progress) progress.style.width = `${percent}%`;
      nav?.classList.toggle('scrolled', window.scrollY > 40);
    },
    { passive: true },
  );
}

/** Initialise scroll-reveal animations for elements with `.reveal`. */
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add('in');
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  for (const el of queryAll('.reveal')) observer.observe(el);
}

/** Wire up all ambient page chrome. Call once on startup. */
export function initBackground() {
  initParticles();
  initCursor();
  initScroll();
  initReveal();
}
