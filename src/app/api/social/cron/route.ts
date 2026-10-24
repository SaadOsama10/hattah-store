import { timingSafeEqual } from "crypto";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import { dispatchWorkflow, hasActiveRun } from "@/lib/github-dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Reliable trigger for the social pipeline. Supabase pg_cron calls this every 5 minutes
 * (GitHub's own `schedule` trigger is throttled/skipped on quiet repos). It never publishes
 * itself — it only wakes the GitHub workflows when there is work to do:
 *   • approved posts that are due        → social-publish.yml
 *   • tomorrow has no posts after 03:00  → social-generate.yml (mode=tomorrow)
 * Double-publishing is impossible: publish.ts takes an atomic 'publishing' lock per post, and the
 * workflows share a concurrency group, so overlapping triggers (this + GitHub's cron) are safe.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabaseClient();
  const { data: settings } = await supabase.from("social_settings").select("enabled, auto_approve").eq("id", 1).single();
  if (!settings?.enabled) return Response.json({ ok: true, enabled: false });

  const actions: string[] = [];
  const now = new Date();

  // 1) due posts → publish workflow
  const statuses = settings.auto_approve ? ["approved", "draft"] : ["approved"];
  const { count: due } = await supabase
    .from("social_posts")
    .select("id", { count: "exact", head: true })
    .in("status", statuses)
    .not("image_url", "is", null)
    .lte("scheduled_at", now.toISOString())
    .gte("scheduled_at", new Date(now.getTime() - 12 * 3600e3).toISOString());
  if ((due ?? 0) > 0 && !(await hasActiveRun("social-publish.yml"))) {
    await dispatchWorkflow("social-publish.yml", {});
    actions.push(`publish (${due} due)`);
  }

  // 2) tomorrow's posts missing after 03:00 Istanbul → generate workflow
  const istanbul = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", hour12: false }).format(now);
  if (Number(istanbul) >= 3) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
    const tomorrowStart = new Date(new Date(`${today}T00:00:00+03:00`).getTime() + 86400e3);
    const { count: planned } = await supabase
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at", tomorrowStart.toISOString())
      .lt("scheduled_at", new Date(tomorrowStart.getTime() + 86400e3).toISOString())
      .neq("status", "skipped");
    if ((planned ?? 0) === 0 && !(await hasActiveRun("social-generate.yml"))) {
      await dispatchWorkflow("social-generate.yml", { mode: "tomorrow" });
      actions.push("generate tomorrow");
    }
  }

  return Response.json({ ok: true, actions });
}

export const GET = handle;
export const POST = handle;
