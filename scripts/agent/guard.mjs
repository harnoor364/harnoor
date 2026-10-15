/* =====================================================================
   Safety guard for AI-proposed changes. Pure functions (unit-tested).

   The AI may only propose changes to website content files. It may NOT
   touch security configuration, CI workflows, tests, checks, the agent
   itself or dependencies; it may not remove spam protection, form
   handling, security headers or output escaping; and changes are size-
   limited. A rejected patch is reported, never applied.
   ===================================================================== */

export const ALLOWED_PATHS = [
  /^[a-z0-9-]+\.html$/,       // pages in the site root
  /^css\/[a-z0-9._-]+\.css$/,
  /^js\/(main|data)\.js$/,
  /^sitemap\.xml$/,
  /^robots\.txt$/,
];

// Never editable by the agent, even if a pattern above would match.
export const FORBIDDEN_PATHS = [
  /^\.github\//, /^scripts\//, /^tests\//, /^docs\//, /^node_modules\//,
  /^netlify\.toml$/, /^vercel\.json$/, /^package(-lock)?\.json$/,
  /^playwright\.config\./, /^\.htmlvalidate\.json$/, /^\.gitignore$/, /(^|\/)\.env/,
];

// Lines that must never be removed (security controls).
export const PROTECTED_LINE_PATTERNS = [
  /data-netlify="true"/, /netlify-honeypot=/, /name="bot-field"/, /name="form-name"/,
  /const esc = /, /const safeUrl = /, /\besc\(/, /safeUrl\(/,
  /rel="noopener"/, /Content-Security-Policy/, /required/,
];

// Content that must never be added.
export const FORBIDDEN_ADDITIONS = [
  /<script(?![^>]*\bsrc="js\/)(?![^>]*application\/ld\+json)/i, // inline or third-party scripts
  /\son[a-z]+\s*=/i,                                            // inline event handlers
  /\beval\s*\(|new Function\s*\(|document\.write\s*\(/,
  /javascript:/i,
  /(?:sk-ant-|ghp_|github_pat_|AKIA|rzp_live_|BEGIN [A-Z ]*PRIVATE KEY)/,
  /<iframe/i,
];

export const MAX_CHANGED_LINES = 300;
export const MAX_FILES = 8;

/** Parse a unified diff into { files: [{path, added:[], removed:[]}] } */
export function parseDiff(diff) {
  const files = [];
  let cur = null;
  for (const line of String(diff || "").split("\n")) {
    const header = line.match(/^\+\+\+ (?:b\/)?(.+)$/);
    if (header) { cur = { path: header[1].trim(), added: [], removed: [] }; files.push(cur); continue; }
    const minus = line.match(/^--- (?:a\/)?(.+)$/);
    if (minus) { files.push({ path: minus[1].trim(), added: [], removed: [], fromHeader: true }); cur = null; continue; }
    if (!cur) continue;
    if (line.startsWith("+")) cur.added.push(line.slice(1));
    else if (line.startsWith("-")) cur.removed.push(line.slice(1));
  }
  // merge "--- a/x" entries into the following "+++ b/x" entries
  const merged = new Map();
  for (const f of files) {
    if (f.path === "/dev/null") continue;
    const m = merged.get(f.path) || { path: f.path, added: [], removed: [] };
    m.added.push(...f.added); m.removed.push(...f.removed);
    merged.set(f.path, m);
  }
  return { files: [...merged.values()] };
}

/** Returns { ok, reasons[] }. ok=false means the patch must not be applied. */
export function validatePatch(diff) {
  const reasons = [];
  if (!diff || !diff.trim()) return { ok: false, reasons: ["empty patch"] };
  if (/^(?:GIT binary patch|Binary files)/m.test(diff)) reasons.push("binary changes are not allowed");
  if (/^(?:rename|copy) (?:from|to) /m.test(diff) || /^deleted file mode/m.test(diff) || /^\+\+\+ \/dev\/null/m.test(diff)) reasons.push("deleting or renaming files is not allowed");

  const { files } = parseDiff(diff);
  if (!files.length) reasons.push("no files found in patch");
  if (files.length > MAX_FILES) reasons.push(`too many files (${files.length} > ${MAX_FILES})`);

  let changed = 0;
  for (const f of files) {
    const p = f.path.replace(/^\.\//, "");
    if (p.includes("..") || p.startsWith("/")) reasons.push(`${p}: path traversal is not allowed`);
    if (FORBIDDEN_PATHS.some((re) => re.test(p))) reasons.push(`${p}: protected file - needs a human`);
    else if (!ALLOWED_PATHS.some((re) => re.test(p))) reasons.push(`${p}: not in the list of files the agent may edit`);
    changed += f.added.length + f.removed.length;
    for (const line of f.removed) {
      const keepsIt = (re) => f.added.some((a) => re.test(a));
      const hit = PROTECTED_LINE_PATTERNS.find((re) => re.test(line) && !keepsIt(re));
      if (hit) reasons.push(`${p}: removes a protected security control (${hit})`);
    }
    for (const line of f.added) {
      const hit = FORBIDDEN_ADDITIONS.find((re) => re.test(line));
      if (hit) reasons.push(`${p}: adds forbidden content (${hit})`);
    }
  }
  if (changed > MAX_CHANGED_LINES) reasons.push(`patch too large (${changed} changed lines > ${MAX_CHANGED_LINES})`);
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

/** Validate the AI's JSON answer against the expected shape. */
export const SEVERITIES = ["critical", "high", "medium", "low", "info"];
export function validateDiagnosis(d) {
  const errors = [];
  const isStr = (v) => typeof v === "string";
  if (!d || typeof d !== "object") return { ok: false, errors: ["not an object"] };
  if (!SEVERITIES.includes(d.severity)) errors.push("severity invalid");
  for (const k of ["title", "summary", "probable_cause", "recommended_fix", "patch"]) if (!isStr(d[k])) errors.push(`${k} must be a string`);
  if (!Array.isArray(d.confirmed_findings) || !d.confirmed_findings.every((f) => isStr(f.finding) && isStr(f.evidence))) errors.push("confirmed_findings must be [{finding, evidence}]");
  if (!Array.isArray(d.hypotheses) || !d.hypotheses.every((h) => isStr(h.hypothesis) && isStr(h.how_to_confirm))) errors.push("hypotheses must be [{hypothesis, how_to_confirm}]");
  if (typeof d.security_incident !== "boolean") errors.push("security_incident must be boolean");
  if (!Array.isArray(d.containment_recommendations)) errors.push("containment_recommendations must be an array");
  if (/\b(completely|fully|100%|totally)\s+secure\b/i.test(JSON.stringify(d))) errors.push("must not claim the site is completely secure");
  return { ok: errors.length === 0, errors };
}
