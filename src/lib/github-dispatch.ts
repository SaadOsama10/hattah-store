import "server-only";

/** Triggers a GitHub Actions workflow_dispatch. Rendering needs Chromium,
 * which can't run on Vercel, so heavy work (generate / regenerate / publish
 * now) is delegated to the repo's workflows. */
export async function dispatchWorkflow(
  workflow: "social-generate.yml" | "social-collect.yml" | "social-publish.yml" | "seo-descriptions.yml" | "seo-health.yml",
  inputs: Record<string, string>
): Promise<void> {
  const token = process.env.GH_DISPATCH_TOKEN;
  const repo = process.env.GH_REPO || "SaadOsama10/hattah-store";
  if (!token) throw new Error("GH_DISPATCH_TOKEN غير مضبوط في Vercel");
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: process.env.GH_REF || "main", inputs }),
    }
  );
  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

/** True when the workflow already has a queued or running run (so a tick doesn't pile up duplicates). */
export async function hasActiveRun(workflow: "social-generate.yml" | "social-collect.yml" | "social-publish.yml"): Promise<boolean> {
  const token = process.env.GH_DISPATCH_TOKEN;
  const repo = process.env.GH_REPO || "SaadOsama10/hattah-store";
  if (!token) return false;
  for (const status of ["in_progress", "queued"]) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?status=${status}&per_page=1`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        cache: "no-store",
      }
    );
    if (res.ok && ((await res.json()).total_count ?? 0) > 0) return true;
  }
  return false;
}

/** Starts the build of a manual post (text + render). Local dev can run the script directly instead of GitHub Actions. */
export async function startManualBuild(postId: string): Promise<void> {
  if (process.env.MANUAL_BUILD_LOCAL === "1" && process.env.NODE_ENV !== "production") {
    const { spawn } = await import("node:child_process");
    const path = await import("node:path");
    spawn("npx", ["tsx", "src/manual.ts", `--post=${postId}`], {
      cwd: path.join(process.cwd(), "automation"),
      detached: true,
      stdio: "ignore",
      env: { ...process.env, DRY_RUN: "true" },
    }).unref();
    return;
  }
  await dispatchWorkflow("social-generate.yml", { mode: "manual", post_id: postId });
}

/** Consecutive failed runs of a workflow (newest first) and when the newest finished. Used as a circuit breaker:
 * when the workflow itself dies (e.g. npm ci / GitHub outage) the in-script kill switch never runs, and re-dispatching
 * every 5 minutes only produced one failure email per tick. */
export async function recentFailureStreak(workflow: "social-generate.yml" | "social-collect.yml" | "social-publish.yml"): Promise<{ failures: number; lastAt: number | null }> {
  const token = process.env.GH_DISPATCH_TOKEN;
  const repo = process.env.GH_REPO || "SaadOsama10/hattah-store";
  if (!token) return { failures: 0, lastAt: null };
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?status=completed&per_page=10`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
  });
  if (!res.ok) return { failures: 0, lastAt: null };
  const runs = ((await res.json()).workflow_runs ?? []) as { conclusion: string | null; updated_at: string }[];
  let failures = 0;
  for (const r of runs) {
    if (r.conclusion === "failure" || r.conclusion === "timed_out") failures++;
    else if (r.conclusion === "cancelled") continue;
    else break;
  }
  return { failures, lastAt: runs.length ? new Date(runs[0].updated_at).getTime() : null };
}
