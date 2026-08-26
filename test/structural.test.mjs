/* Structural checks on index.html: anchors resolve, filters cover categories,
   every section is present, no external render assets are referenced. */

import { existsSync, readFileSync } from "node:fs";

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

/* Self-hosted logo images only — every box logo must exist on disk. */
const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
assert(
  imgs.length === 12,
  `expected exactly 12 logo images (one per tech box), found ${imgs.length}`
);
for (const tag of imgs) {
  const src = /src="([^"]+)"/.exec(tag)?.[1] ?? "";
  const alt = /alt="([^"]*)"/.exec(tag)?.[1] ?? "";
  assert(src.startsWith("/logos/"), `logo src must be self-hosted: ${src}`);
  assert(alt.length > 0, `logo missing alt text: ${src}`);
  assert(/width="44"/.test(tag), `logo missing width: ${src}`);
  assert(/height="44"/.test(tag), `logo missing height: ${src}`);
  const file = `public${src}`;
  assert(existsSync(file), `logo file missing on disk: ${file}`);
}

/* No external render assets otherwise (frames stay the only imagery). */
assert(
  !/<script[^>]+src="https?:/i.test(html),
  "external scripts are not allowed"
);
assert(
  !/<link[^>]+(stylesheet|font)/i.test(html),
  "external stylesheets/fonts are not allowed"
);
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
for (const src of scripts) {
  assert(src.startsWith("/src/") || src.startsWith("/"), `unexpected script src: ${src}`);
}

/* Glass system is applied across sections (panels, strips, boxes). */
const glassCount = (html.match(/class="glass/g) || []).length;
assert(glassCount >= 6, `expected 6+ glass surfaces, found ${glassCount}`);
const buttonCount = (html.match(/class="btn/g) || []).length;
assert(buttonCount >= 12, `expected 12+ glass buttons, found ${buttonCount}`);

/* Editorial rows match the source portfolio's list layout. */
const rowCount = (modifier) =>
  (html.match(new RegExp(`class="row row--${modifier}"`, "g")) || []).length;
assert(rowCount("cap") === 4, `expected 4 capability rows, found ${rowCount("cap")}`);
assert(rowCount("work") === 4, `expected 4 work rows, found ${rowCount("work")}`);
assert(rowCount("cert") === 4, `expected 4 certificate rows, found ${rowCount("cert")}`);
assert(rowCount("method") === 8, `expected 8 method rows, found ${rowCount("method")}`);

/* Featured tool lines from the source data are present. */
for (const line of [
  "Component-driven user interfaces with a maintainable architecture",
  "JavaScript runtime for server-side applications and tooling",
  "Firmware and control logic for microcontroller projects",
  "Hosting, review, and delivery for source code",
]) {
  assert(html.includes(line), `missing capability feature line: ${line}`);
}

if (failures.length) {
  console.error("structural test FAILED:\n  " + failures.join("\n  "));
  process.exit(1);
}

console.log(
  `structural test OK — ${ids.size} ids, ${anchors.length} anchors, ${glassCount} glass surfaces, ${buttonCount} buttons`
);
