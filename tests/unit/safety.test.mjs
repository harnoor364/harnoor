import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, redactDeep } from "../../scripts/lib/redact.mjs";
import { validatePatch, validateDiagnosis } from "../../scripts/agent/guard.mjs";

/* ---------------- Redaction ---------------- */
test("redacts secrets, tokens and personal data", () => {
  const input = [
    "password=hunter2", "token: abc123", "Authorization: Bearer abc.def.ghi1234",
    "Cookie: sid=xyz; theme=dark", "sk-ant-api03-AAAAAAAAAAAAAAAAAAAA", "ghp_aaaaaaaaaaaaaaaaaaaaaaaaaa",
    "AKIAABCDEFGHIJKLMNOP", "harnoor459456@gmail.com", "+91 79733 53244", "9876543210",
    "4111 1111 1111 1111", "203.0.113.9", "https://x/?api_key=zzz&page=2",
  ].join("\n");
  const out = redact(input);
  for (const leak of ["hunter2", "abc123", "abc.def.ghi1234", "xyz", "sk-ant-api03", "ghp_aaaa", "AKIAABCD", "harnoor459456", "79733", "9876543210", "4111 1111", "203.0.113.9", "zzz"]) {
    assert.ok(!out.includes(leak), `leaked: ${leak}`);
  }
  assert.ok(out.includes("page=2"), "keeps harmless data");
});

test("keeps ordinary diagnostic data", () => {
  const s = "HTTP 404 /contact.html took 532 ms at 2026-10-15T10:00:00Z, price ₹24,999 /month";
  assert.equal(redact(s), s);
});

test("redactDeep handles nested objects", () => {
  const out = redactDeep({ a: { email: "x@y.com", n: 3 }, list: ["password=1"] });
  assert.equal(out.a.email, "[REDACTED:EMAIL]");
  assert.equal(out.a.n, 3);
  assert.match(out.list[0], /REDACTED/);
});

/* ---------------- Patch guard ---------------- */
const diff = (file, removed, added) => `--- a/${file}\n+++ b/${file}\n@@ -1,1 +1,1 @@\n${removed.map((l) => `-${l}`).join("\n")}\n${added.map((l) => `+${l}`).join("\n")}\n`;

test("allows a small content fix", () => {
  const r = validatePatch(diff("pricing.html", ["<p>Old text</p>"], ["<p>New text</p>"]));
  assert.equal(r.ok, true, r.reasons.join(", "));
});

test("blocks changes to security config, CI, tests and the agent itself", () => {
  for (const f of ["netlify.toml", "vercel.json", ".github/workflows/ci.yml", "tests/e2e/site.spec.mjs", "scripts/agent/guard.mjs", "package.json", ".env"]) {
    assert.equal(validatePatch(diff(f, ["a"], ["b"])).ok, false, `${f} should be blocked`);
  }
});

test("blocks path traversal and unknown files", () => {
  assert.equal(validatePatch(diff("../etc/passwd", ["a"], ["b"])).ok, false);
  assert.equal(validatePatch(diff("images/x.svg", ["a"], ["b"])).ok, false);
});

test("blocks removing spam protection, escaping or required fields", () => {
  assert.equal(validatePatch(diff("contact.html", ['<p class="hidden-field"><label><input type="text" name="bot-field"></label></p>'], [""])).ok, false);
  assert.equal(validatePatch(diff("js/main.js", ["  const esc = (str) =>"], ["  const esc = (s) => s;"])).ok, true, "keeping esc defined is fine");
  assert.equal(validatePatch(diff("js/main.js", ['<blockquote>${esc(r.text)}</blockquote>'], ["<blockquote>${r.text}</blockquote>"])).ok, false);
  assert.equal(validatePatch(diff("contact.html", ['<input id="c-name" name="name" required>'], ['<input id="c-name" name="name">'])).ok, false);
});

test("blocks adding scripts, handlers, eval, iframes and secrets", () => {
  for (const bad of ['<script>alert(1)</script>', '<script src="https://evil.example/x.js"></script>', '<img src=x onerror="steal()">', "eval(location.hash)", '<a href="javascript:x">', "<iframe src=//evil>", "const k = 'sk-ant-api03-xxxxxxxxxxxx'"]) {
    assert.equal(validatePatch(diff("index.html", ["<p>a</p>"], [bad])).ok, false, `should block: ${bad}`);
  }
});

test("blocks deleting files and oversized patches", () => {
  assert.equal(validatePatch("diff --git a/index.html b/index.html\ndeleted file mode 100644\n--- a/index.html\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n").ok, false);
  const big = diff("index.html", Array(200).fill("old"), Array(200).fill("new"));
  assert.equal(validatePatch(big).ok, false);
});

/* ---------------- Diagnosis shape ---------------- */
const good = { title: "t", severity: "low", summary: "s", impact: "i", confirmed_findings: [{ finding: "f", evidence: "e" }], hypotheses: [{ hypothesis: "h", how_to_confirm: "c" }], probable_cause: "p", recommended_fix: "r", security_incident: false, containment_recommendations: [], patch: "", patch_explanation: "", human_actions: [] };

test("accepts a well-formed diagnosis", () => assert.equal(validateDiagnosis(good).ok, true));
test("rejects claims that the site is completely secure", () => {
  assert.equal(validateDiagnosis({ ...good, summary: "The website is completely secure." }).ok, false);
});
test("rejects unknown severities and missing evidence", () => {
  assert.equal(validateDiagnosis({ ...good, severity: "urgent" }).ok, false);
  assert.equal(validateDiagnosis({ ...good, confirmed_findings: [{ finding: "x" }] }).ok, false);
});
