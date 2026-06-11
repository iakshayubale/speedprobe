/**
 * Tiny DOM helpers used across the UI modules. Keeping these in one place
 * avoids repeating `document.getElementById` everywhere and gives a single
 * seam for future testing.
 *
 * @module dom
 */

/**
 * Look up an element by id.
 * @param {string} id
 * @returns {HTMLElement | null}
 */
export const byId = (id) => document.getElementById(id);

/**
 * Query all elements matching a selector.
 * @param {string} selector
 * @returns {NodeListOf<Element>}
 */
export const queryAll = (selector) => document.querySelectorAll(selector);

/**
 * Set the text content of an element by id. No-op if the element is missing.
 * @param {string} id
 * @param {string} text
 */
export function setText(id, text) {
  const element = byId(id);
  if (element) element.textContent = text;
}

/**
 * Toggle a class on an element by id. No-op if the element is missing.
 * @param {string} id
 * @param {string} className
 * @param {boolean} [force]
 */
export function toggleClass(id, className, force) {
  const element = byId(id);
  if (element) element.classList.toggle(className, force);
}
