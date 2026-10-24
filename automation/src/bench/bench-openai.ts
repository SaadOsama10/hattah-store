// Measures OpenAI cost for ONE day of generation (6 feed + 3 reels = 9 full captions, 8 stories = 8 on-image texts) — no DB writes.
// Usage: tsx src/bench/bench-openai.ts baseline|new|batch   → previews/bench-<variant>.json + a summary in the log
import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "../env.js";
import { getSupabase } from "../db.js";
import { PRODUCT_SELECT, loadAvoidHints, loadCategories, loadRecentTexts, loadSettings } from "../pipeline.js";
import { checkCaptionJson, generateCaption, makeDuplicateChecker, parseModelText, recordUsage, usageLog, type CaptionMode } from "../captions.js";
import { legacyUsage, setLegacyLabel, generateCaption as legacyGenerate } from "./legacy-captions.js";
import { openai, readBatchResults, submitBatch } from "../batch.js";
import { ANGLES, type ProductRecord } from "../types.js";
import { log } from "../time.js";

loadEnv();
const variant = process.argv[2] as "baseline" | "new" | "batch";
if (!["baseline", "new", "batch"].includes(variant)) throw new Error("variant: baseline | new | batch");
const sb = getSupabase();
const settings = await loadSettings(sb);
const cats = await loadCategories(sb);

const { data: prods } = await sb.from("products").select(PRODUCT_SELECT).order("id");
const eligible = (prods as unknown as ProductRecord[]).filter((p) => (p.product_images ?? []).length > 0 && !(settings.excluded_product_ids ?? []).includes(p.id));
const day = eligible.slice(0, 17).map((p, i) => ({
  p,
  angle: ANGLES[i % 4],
  mode: (i < 9 ? "full" : "design") as CaptionMode,
  kind: i < 6 ? "feed" : i < 9 ? "reel" : "story",
  categoryAr: cats.get(p.category)?.label_ar ?? "",
}));
const recent = await loadRecentTexts(sb);
log(`bench ${variant}: ${day.length} items, ${recent.length} recent texts (30 days)`);

const outputs: any[] = [];
const price = { in: 2, cached: 0.1, out: 10 };
const costOf = (i: number, c: number, o: number, batch = false) => (((i - c) * price.in + c * price.cached + o * price.out) / 1e6) * (batch ? 0.5 : 1);
let rows: { label: string; input: number; cached: number; output: number; reasoning: number; cost: number }[] = [];
let ablation: Record<string, number> = {};

if (variant === "baseline") {
  for (const [i, d] of day.entries()) {
    setLegacyLabel(`${d.kind} ${d.p.name_ar.slice(0, 18)}`);
    const before = legacyUsage.length;
    const res = await legacyGenerate(d.p, d.categoryAr, d.angle, settings, recent, i % 10);
    outputs.push({ kind: d.kind, product: d.p.name_ar, angle: d.angle, design: res.design, caption: res.caption, calls: legacyUsage.length - before });
  }
  // ablation on item 0: the same call without the 30-day list shows exactly how many tokens that list costs
  const d0 = day[0];
  setLegacyLabel("ablation: no recent list");
  await legacyGenerate(d0.p, d0.categoryAr, d0.angle, settings, [], 0);
  const withList = legacyUsage.find((u) => u.label.startsWith(`${d0.kind} `))!.usage;
  const without = legacyUsage[legacyUsage.length - 1].usage;
  ablation = { recent_list_tokens_per_call: withList.input_tokens - without.input_tokens, input_with_list: withList.input_tokens, input_without_list: without.input_tokens };
  rows = legacyUsage
    .filter((u) => !u.label.startsWith("ablation"))
    .map((u) => ({ label: u.label, input: u.usage.input_tokens, cached: u.usage.input_tokens_details?.cached_tokens ?? 0, output: u.usage.output_tokens, reasoning: u.usage.output_tokens_details?.reasoning_tokens ?? 0, cost: costOf(u.usage.input_tokens, u.usage.input_tokens_details?.cached_tokens ?? 0, u.usage.output_tokens) }));
} else if (variant === "new") {
  const dup = makeDuplicateChecker(recent);
  void dup;
  for (const [i, d] of day.entries()) {
    const res = await generateCaption(d.p, d.categoryAr, d.angle, settings, { mode: d.mode, avoid: await loadAvoidHints(sb, d.p.id, d.angle), recent, label: `${d.kind} ${d.p.name_ar.slice(0, 18)}` }, i % 10);
    outputs.push({ kind: d.kind, product: d.p.name_ar, angle: d.angle, design: res.design, caption: res.caption });
  }
  rows = usageLog.map((u) => ({ label: u.label, input: u.input, cached: u.cached, output: u.output, reasoning: u.reasoning, cost: u.cost }));
} else {
  const items = await Promise.all(
    day.map(async (d, i) => ({ customId: `bench-${i}`, input: { product: d.p, categoryAr: d.categoryAr, angle: d.angle, languages: settings.caption_languages, mode: d.mode, avoid: await loadAvoidHints(sb, d.p.id, d.angle) } })),
  );
  const batchId = await submitBatch(items);
  const client = openai();
  const t0 = Date.now();
  let remote = await client.batches.retrieve(batchId);
  while (!["completed", "failed", "expired", "cancelled"].includes(remote.status) && Date.now() - t0 < 50 * 60e3) {
    await new Promise((r) => setTimeout(r, 30_000));
    remote = await client.batches.retrieve(batchId);
    log(`batch ${remote.status} ${remote.request_counts?.completed ?? 0}/${remote.request_counts?.total ?? 0} (${Math.round((Date.now() - t0) / 1000)}s)`);
  }
  log(`batch finished with status ${remote.status} after ${Math.round((Date.now() - t0) / 1000)}s`);
  if (remote.status !== "completed") {
    await client.batches.cancel(batchId).catch(() => {});
    throw new Error(`batch ended as ${remote.status}`);
  }
  const results = await readBatchResults(client, remote);
  const dup = makeDuplicateChecker(recent);
  let rejected = 0;
  for (const [i, d] of day.entries()) {
    const r = results.get(`bench-${i}`);
    if (!r?.text) { log(`item ${i}: ${r?.error}`); rejected++; continue; }
    recordUsage(`${d.kind} ${d.p.name_ar.slice(0, 18)}`, r.usage, true);
    const checked = checkCaptionJson(parseModelText(r.text), d.mode, d.p, settings, dup);
    if (!checked.json) { log(`item ${i} would need a retry: ${checked.reason}`); rejected++; }
    outputs.push({ kind: d.kind, product: d.p.name_ar, angle: d.angle, accepted: !!checked.json, reason: checked.reason, design: checked.json ? { headline: checked.json.image_headline, subline: checked.json.image_subline } : null });
  }
  log(`batch answers needing a normal-API retry: ${rejected}`);
  rows = usageLog.map((u) => ({ label: u.label, input: u.input, cached: u.cached, output: u.output, reasoning: u.reasoning, cost: u.cost }));
}

const sum = (k: "input" | "cached" | "output" | "reasoning" | "cost") => rows.reduce((a, r) => a + r[k], 0);
const summary = { variant, calls: rows.length, input: sum("input"), cached: sum("cached"), output: sum("output"), reasoning: sum("reasoning"), cost_usd: +sum("cost").toFixed(4), ablation };
log("SUMMARY " + JSON.stringify(summary));
for (const r of rows) log(`  ${r.label.padEnd(34)} in ${String(r.input).padStart(5)} cached ${String(r.cached).padStart(5)} out ${String(r.output).padStart(5)} (reasoning ${String(r.reasoning).padStart(4)}) $${r.cost.toFixed(4)}`);
mkdirSync("previews", { recursive: true });
writeFileSync(`previews/bench-${variant}.json`, JSON.stringify({ summary, rows, outputs }, null, 2));
process.exit(0);
