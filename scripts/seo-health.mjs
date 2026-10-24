// Weekly SEO / performance health check. Usage: node scripts/seo-health.mjs
// Env: SITE_URL (default https://hattah-store.vercel.app), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      RUN_URL (optional), MIN_PERF (default 75; warns only after two consecutive checks below it), MIN_SCORE (default 90, for SEO/accessibility/best-practices), SKIP_LIGHTHOUSE=1 for a quick structural check.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SITE = (process.env.SITE_URL || "https://hattah-store.vercel.app").replace(/\/+$/, "");
const MIN_PERF = Number(process.env.MIN_PERF || 75); // runner performance scores fluctuate 76-89 on identical code
const MIN = Number(process.env.MIN_SCORE || 90);
const minFor = (k) => (k === "performance" ? MIN_PERF : MIN);
const problems = [];
const scores = {};
const problem = (area, message) => problems.push({ area, message });

// Previous check's scores: a performance dip only becomes a warning when the same page was also below the threshold last time.
let prevScores = {};
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/seo_health?id=eq.1&select=scores`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (r.ok) prevScores = (await r.json())[0]?.scores ?? {};
  } catch {}
}

const get = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": "hattah-seo-health/1.0" }, redirect: "follow" });
  return { status: res.status, text: await res.text() };
};

/* ── sitemap / robots / llms ── */
const sm = await get(`${SITE}/sitemap.xml`);
const urls = [...sm.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
if (sm.status !== 200) problem("sitemap", `sitemap.xml returned ${sm.status}`);
else if (!sm.text.includes("<urlset")) problem("sitemap", "sitemap.xml is not a valid <urlset>");
else if (urls.length < 50) problem("sitemap", `sitemap has only ${urls.length} URLs`);
else if (!urls.every((u) => u.startsWith(SITE))) problem("sitemap", "sitemap contains URLs outside the site origin");

const rb = await get(`${SITE}/robots.txt`);
if (rb.status !== 200) problem("robots", `robots.txt returned ${rb.status}`);
else {
  if (!/Sitemap:\s*\S+sitemap\.xml/i.test(rb.text)) problem("robots", "robots.txt has no Sitemap line");
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "OAI-SearchBot"]) {
    if (!rb.text.includes(bot)) problem("robots", `robots.txt does not mention ${bot}`);
  }
  if (/User-Agent:\s*\*\s*\n\s*Disallow:\s*\/\s*$/im.test(rb.text)) problem("robots", "robots.txt blocks the whole site");
}
for (const f of ["/llms.txt", "/llms-full.txt"]) {
  const r = await get(SITE + f);
  if (r.status !== 200 || r.text.length < 200) problem("llms", `${f} returned ${r.status} / ${r.text.length} chars`);
}

/* ── JSON-LD validity on key pages ── */
function jsonLdOf(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const out = [];
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1]);
      out.push(...(j["@graph"] ?? [j]));
      if (j["@context"] !== "https://schema.org" && !j["@graph"]) problem("schema", "a JSON-LD block has no https://schema.org @context");
    } catch (e) {
      problem("schema", `invalid JSON-LD (${e.message})`);
    }
  }
  return out;
}
const types = (n) => [].concat(n["@type"] ?? []);
const productUrl = urls.find((u) => /\/en\/product\//.test(u));
const checks = [
  { url: `${SITE}/en`, label: "home", test: (n) => types(n).some((t) => ["Organization", "LocalBusiness"].includes(t)) && n.name && n.telephone, need: "Organization/LocalBusiness with name+telephone" },
  { url: `${SITE}/en/faq`, label: "faq", test: (n) => types(n).includes("FAQPage") && n.mainEntity?.length > 0, need: "FAQPage with questions" },
  { url: productUrl, label: "product", test: (n) => types(n).includes("Product") && n.name && n.image?.length && (n.offers?.price || n.offers?.lowPrice) && n.offers?.priceCurrency === "TRY", need: "Product with name, image, TRY offer" },
  { url: productUrl, label: "product breadcrumb", test: (n) => types(n).includes("BreadcrumbList") && n.itemListElement?.length >= 2, need: "BreadcrumbList" },
];
for (const c of checks) {
  if (!c.url) { problem("schema", `no URL found for ${c.label}`); continue; }
  const page = await get(c.url);
  if (page.status !== 200) { problem("page", `${c.url} returned ${page.status}`); continue; }
  if (!jsonLdOf(page.text).some(c.test)) problem("schema", `${c.label} (${c.url}) is missing ${c.need}`);
  if (!/<link rel="canonical"/.test(page.text)) problem("seo", `${c.url} has no canonical link`);
  if (!/hrefLang|hreflang/.test(page.text)) problem("seo", `${c.url} has no hreflang links`);
  if ((page.text.match(/<h1[\s>]/g) ?? []).length !== 1) problem("seo", `${c.url} should have exactly one <h1>`);
}
const nf = await fetch(`${SITE}/en/this-page-does-not-exist`, { redirect: "manual" });
if (nf.status !== 404) problem("seo", `unknown URLs return ${nf.status} instead of 404`);

/* ── Lighthouse (mobile) ── */
if (process.env.SKIP_LIGHTHOUSE !== "1") {
  const pages = [`${SITE}/ar`, `${SITE}/en`, `${SITE}/tr`, `${SITE}/ar/shop`, productUrl].filter(Boolean);
  const dir = mkdtempSync(path.join(tmpdir(), "lh-"));
  const RUNS = 3; // a single Lighthouse run fluctuates ±10 points; the median of 3 avoids false warnings
  const median = (xs) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  for (const [i, url] of pages.entries()) {
    const runs = [];
    for (let r = 0; r < RUNS; r++) {
      const out = path.join(dir, `r${i}_${r}.json`);
      try {
        execFileSync("npx", ["--yes", "lighthouse@12", url, "--quiet", "--chrome-flags=--headless=new --no-sandbox", "--only-categories=performance,seo,accessibility,best-practices", "--output=json", `--output-path=${out}`], { stdio: "ignore", timeout: 240000 });
        const c = JSON.parse(readFileSync(out, "utf8")).categories;
        runs.push(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)])));
      } catch (e) {
        if (r === RUNS - 1 && runs.length === 0) problem("lighthouse", `Lighthouse failed for ${url}: ${String(e.message).slice(0, 120)}`);
      }
    }
    if (runs.length === 0) continue;
    const s = Object.fromEntries(Object.keys(runs[0]).map((k) => [k, median(runs.map((x) => x[k]))]));
    scores[url.replace(SITE, "") || "/"] = s;
    const page = url.replace(SITE, "") || "/";
    for (const [k, v] of Object.entries(s)) {
      if (v >= minFor(k)) continue;
      if (k === "performance") {
        const prev = prevScores[page]?.performance;
        if (!(typeof prev === "number" && prev < MIN_PERF)) {
          console.error(`${page}: performance = ${v} (< ${MIN_PERF}) — first dip (previous: ${prev ?? "n/a"}), not warning yet`);
          continue;
        }
        problem("lighthouse", `${page}: performance = ${v} (< ${MIN_PERF}) in two consecutive checks (previous: ${prev}, median of ${runs.length} runs)`);
      } else {
        problem("lighthouse", `${page}: ${k} = ${v} (< ${minFor(k)}, median of ${runs.length} runs)`);
      }
    }
  }
}

const ok = problems.length === 0;
console.log(JSON.stringify({ ok, scores, problems }, null, 2));

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/seo_health?id=eq.1`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ checked_at: new Date().toISOString(), ok, scores, problems, run_url: process.env.RUN_URL ?? null }),
  });
  if (!res.ok) console.error("could not save to seo_health:", res.status, await res.text());
}
process.exit(ok ? 0 : 1);
