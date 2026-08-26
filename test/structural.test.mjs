/* Structural checks on index.html: anchors resolve, filters cover categories,
   every section is present, no external render assets are referenced. */

import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

/* Anchors resolve to real ids. */
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
assert(anchors.length > 0, "no anchor links found");
for (const anchor of anchors) {
  assert(ids.has(anchor), `anchor #${anchor} has no matching id`);
}

/* Filter buttons cover every category used by project cards. */
const filters = new Set(
  [...html.matchAll(/data-filter="([^"]+)"/g)].map((m) => m[1])
);
const categories = new Set(
  [...html.matchAll(/data-cat="([^"]+)"/g)]
    .flatMap((m) => m[1].split(/\s+/))
    .filter(Boolean)
);
for (const category of categories) {
  assert(
    filters.has(category),
    `project category "${category}" has no filter button`
  );
}
assert(filters.has("all"), 'missing "all" filter');

/* Every portfolio section from the source data is present. */
for (const label of [
  "About",
  "At a glance",
  "Stack",
  "Tech Stack",
  "Selected work",
  "Certificates",
  "Rewards",
  "How I work",
  "Let's talk",
]) {
  assert(html.includes(label), `missing section content: ${label}`);
}
for (const key of [
  "Aditya",
  "Innovating Web Solutions",
  "IoT-Based Arduino Projects",
  "Ai Web Tech",
  "Aavishkar District Level",
  "Shell Script",
  "adityamands@gmail.com",
  "+91 9112870744",
  "github.com/Aditya4650-am",
]) {
  assert(html.includes(key), `missing portfolio data: ${key}`);
}

/* Every toolkit tool appears in its own 3D box. */
const TOOLS = [
  "React.js",
  "Next.js",
  "Tailwind CSS",
  "HTML5",
  "Node.js",
  "PostgreSQL",
  "Vercel",
  "Firebase",
  "Arduino",
  "GitHub",
  "JavaScript",
  "CSS3",
];
for (const tool of TOOLS) {
  assert(html.includes(tool), `missing toolkit tool: ${tool}`);
}
const techBoxCount = (html.match(/class="tech-box"/g) || []).length;
assert(
  techBoxCount === TOOLS.length,
  `expected ${TOOLS.length} 3D tech boxes, found ${techBoxCount}`
);
const miniBoxLists = (html.match(/chips chips--3d/g) || []).length;
assert(
  miniBoxLists === 4,
  `expected 4 capability stacks as mini 3D boxes, found ${miniBoxLists}`
);

/* Structure: canvas stage, numbered sections 01–09, footer. */
assert(html.includes('id="canvas"'), "missing canvas");
assert(html.includes('id="video-scroll"'), "missing scroll section");
for (let n = 1; n <= 9; n++) {
  assert(
    new RegExp(`\\b0${n} · `).test(html),
    `missing section label 0${n}`
  );
}
assert(html.includes('class="site-footer"'), "missing footer");
assert(html.includes("© 2026"), "missing footer copyright");

/* No external render assets (frames stay the only imagery). */
assert(!/<img[\s>]/i.test(html), "raw <img> elements are not allowed");
assert(
  !/<link[^>]+(stylesheet|font)/i.test(html),
  "external stylesheets/fonts are not allowed"
);
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
for (const src of scripts) {
  assert(src.startsWith("/src/") || src.startsWith("/"), `unexpected script src: ${src}`);
}

/* Glass system is applied across sections. */
const glassCount = (html.match(/class="glass/g) || []).length;
assert(glassCount >= 25, `expected 25+ glass surfaces, found ${glassCount}`);
const buttonCount = (html.match(/class="btn/g) || []).length;
assert(buttonCount >= 12, `expected 12+ glass buttons, found ${buttonCount}`);

if (failures.length) {
  console.error("structural test FAILED:\n  " + failures.join("\n  "));
  process.exit(1);
}

console.log(
  `structural test OK — ${ids.size} ids, ${anchors.length} anchors, ${glassCount} glass surfaces, ${buttonCount} buttons`
);
