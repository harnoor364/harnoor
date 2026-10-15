/* =====================================================================
   Offline link check: every internal link, image, script and stylesheet
   referenced by a page (or by js/data.js) must exist in the repository,
   and every #anchor must point to an element with that id.
   No network access. Writes reports/link-check.json.
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { redact } from "./lib/redact.mjs";

const ROOT = process.cwd();
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const broken = [];
const idsByPage = Object.fromEntries(pages.map((p) => [p, new Set([...fs.readFileSync(p, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));

function checkRef(from, ref) {
  if (!ref || /^(https?:|mailto:|tel:|data:|javascript:|#$)/i.test(ref)) return;
  const [rawPath, hash] = ref.split("#");
  const clean = rawPath.split("?")[0].replace(/^\//, "");
  const resolved = clean && !fs.existsSync(path.join(ROOT, clean)) && fs.existsSync(path.join(ROOT, clean + ".html")) ? clean + ".html" : clean; // clean URLs
  const target = resolved === "" ? (rawPath === "/" ? "index.html" : from) : resolved;
  if (resolved && !fs.existsSync(path.join(ROOT, resolved))) {
    broken.push({ page: from, ref, problem: "file not found" });
    return;
  }
  if (hash && target.endsWith(".html") && idsByPage[target] && !idsByPage[target].has(hash)) {
    broken.push({ page: from, ref, problem: `no element with id="${hash}" on ${target}` });
  }
}

for (const p of pages) {
  const html = fs.readFileSync(p, "utf8");
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) checkRef(p, m[1]);
}
// Images and links that live in the data file (projects, reviews)
// (comments are stripped first: they contain example entries, not real paths)
const data = fs.readFileSync("js/data.js", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
for (const m of data.matchAll(/(?:image|mobileImage|photo):\s*"([^"]+)"/g)) checkRef("js/data.js", m[1]);

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/link-check.json", redact({ tool: "check-links", pages: pages.length, broken }));
for (const b of broken) console.log(`BROKEN ${b.page} -> ${b.ref} (${b.problem})`);
console.log(`check-links: ${pages.length} pages checked, ${broken.length} broken references`);
process.exit(broken.length ? 1 : 0);
