/* Minimal ScrollTrigger stub for the wiring test. Records calls on a shared
   globalThis registry so the bundled (inlined) copy and the test agree. */

const registry = () => (globalThis.__wt ??= { st: { refresh: 0, batch: 0 } });

export const ScrollTrigger = {
  update() {},
  refresh() {
    registry().st.refresh++;
  },
  batch(elements, config) {
    registry().st.batch++;
    // Reveal in-view targets immediately, like the real batch on refresh.
    const list = Array.isArray(elements) ? elements : [elements];
    if (config?.onEnter) config.onEnter(list.slice(0, 1));
  },
};
