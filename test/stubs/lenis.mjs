/* Minimal Lenis stub for the wiring test. Records scrollTo calls on a shared
   globalThis registry so the bundled (inlined) copy and the test agree. */

const registry = () => (globalThis.__wt ??= { lenis: [] });

export default class Lenis {
  constructor() {
    registry();
  }

  on() {}

  raf() {}

  scrollTo(target, options) {
    registry().lenis.push({ target, options });
  }
}
