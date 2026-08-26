/* Minimal gsap stub for the wiring test. Records calls on a shared
   globalThis registry so the bundled (inlined) copy and the test agree. */

const registry = () => (globalThis.__wt ??= { gsap: { to: 0, set: 0, ticker: 0 } });

const gsap = {
  registerPlugin() {},
  ticker: {
    add() {
      registry().gsap.ticker++;
    },
    lagSmoothing() {},
  },
  set() {
    registry().gsap.set++;
  },
  to() {
    registry().gsap.to++;
    return {};
  },
  utils: {
    toArray(selector) {
      if (typeof selector === "string") {
        return Array.from(document.querySelectorAll(selector));
      }
      return Array.from(selector);
    },
  },
};

export default gsap;
