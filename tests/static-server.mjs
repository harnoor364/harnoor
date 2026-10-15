/* Tiny static file server for tests. Applies the same security headers as
   netlify.toml so the tests catch anything the Content-Security-Policy
   would block on the live site. Listens on 127.0.0.1 only. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".xml": "application/xml", ".txt": "text/plain", ".json": "application/json" };

// Read headers for "/*" from netlify.toml (skip HSTS/upgrade-insecure-requests: tests run on http)
const toml = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
const section = toml.split(/\[\[headers\]\]/).find((s) => /for\s*=\s*"\/\*"/.test(s)) || "";
const HEADERS = [...section.matchAll(/^\s*([A-Za-z-]+)\s*=\s*"([^"]*)"/gm)]
  .filter(([, k]) => k !== "for" && k !== "Strict-Transport-Security")
  .map(([, k, v]) => [k, v.replace(/;\s*upgrade-insecure-requests/, "")]);

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  for (const [k, v] of HEADERS) res.setHeader(k, v);
  if (req.method === "POST") { res.writeHead(404).end(); return; } // Netlify Forms only exist on Netlify
  if (!fs.existsSync(file)) { res.writeHead(404, { "Content-Type": TYPES[".html"] }); fs.createReadStream(path.join(ROOT, "404.html")).pipe(res); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`test server on http://127.0.0.1:${PORT}`));
