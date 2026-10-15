/* =====================================================================
   Redaction: removes secrets and personal data from any text before it
   is written to a report, posted to a GitHub issue or sent to the AI.

   Order matters: specific secret formats first, then generic patterns,
   then personal data. Every match is replaced with a labelled marker so
   reports stay readable ("[REDACTED:EMAIL]").
   ===================================================================== */

const RULES = [
  // Private keys (multi-line blocks)
  ["PRIVATE_KEY", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  // Well-known API key / token formats
  ["ANTHROPIC_KEY", /\bsk-ant-[A-Za-z0-9_-]{10,}/g],
  ["API_KEY", /\bsk-(?:live|test|proj)?[-_]?[A-Za-z0-9]{20,}/g],
  ["GITHUB_TOKEN", /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g],
  ["AWS_KEY", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ["RAZORPAY_KEY", /\brzp_(?:live|test)_[A-Za-z0-9]{8,}/g],
  ["NETLIFY_TOKEN", /\bnfp_[A-Za-z0-9]{20,}/g],
  ["JWT", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g],
  // Headers that carry credentials or sessions
  ["AUTH_HEADER", /\b(authorization|proxy-authorization|x-api-key|api-key)(\s*[:=]\s*)("?)[^\s"',;]+(?:\s+[^\s"',;]+)?/gi],
  ["COOKIE", /\b(set-cookie|cookie)(\s*[:=]\s*)(?:[^\s=;,]+=[^\s;,]*(?:;\s*)?)+/gi],
  ["BEARER", /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi],
  // key=value secrets in URLs, JSON, env files and logs
  ["SECRET", /\b([A-Za-z0-9_]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|session(?:id)?|sid|otp|pin)[A-Za-z0-9_]*)("?\s*[:=]\s*"?)([^\s"'&,;}]+)/gi],
  // Personal information
  ["EMAIL", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["CARD", /\b(?:\d[ -]?){13,19}\b/g],
  ["PHONE", /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)\d{3,5}[\s-]?\d{4,5}\b/g],
  ["IP", /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
];

/** Redact one string. Non-strings are converted with JSON.stringify first. */
export function redact(value) {
  let text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text) return text;
  for (const [label, re] of RULES) {
    text = text.replace(re, (...m) => {
      // Keep the key name for key=value style matches so the report stays useful
      if (label === "SECRET" || label === "AUTH_HEADER" || label === "COOKIE") return `${m[1]}${m[2]}[REDACTED:${label}]`;
      return `[REDACTED:${label}]`;
    });
  }
  return text;
}

/** Redact every string inside an object/array (returns a new value). */
export function redactDeep(value) {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  }
  return value;
}
