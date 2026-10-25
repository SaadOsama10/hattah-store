import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { log } from "./time.js";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MUSIC_BUCKET = "social-music";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface Track {
  file: string;
  title: string;
  artist: string;
  source: string;
  /** Tempo and the time (s) of the first beat inside the excerpt — from music/analyze_beats.py. */
  bpm: number;
  offset: number;
}

export const EXCERPT_SECONDS = 45;

/** Start offset (s) inside the excerpt so that a beat lands exactly on t=0 of the reel; `index` varies the section. */
export function musicStartFor(track: Track, index: number, seconds: number): number {
  const period = 60 / track.bpm;
  const room = EXCERPT_SECONDS - seconds - 1.5 - track.offset;
  const beats = Math.max(0, Math.floor(room / period));
  const k = (Math.abs(index) * 7 + 3) % (beats + 1);
  return track.offset + k * period;
}

export const tracks = (): Track[] => JSON.parse(readFileSync(path.join(ROOT, "music", "tracks.json"), "utf8"));

/** Rotates through the tracks: `index` (e.g. the number of reels already made) picks the next one. */
export function pickTrack(index: number): Track {
  const all = tracks();
  return all[((index % all.length) + all.length) % all.length];
}

/** Downloads a track excerpt from the private bucket to a local temp file (cached per run). */
export async function trackFile(sb: SupabaseClient, track: Track): Promise<string> {
  const dir = path.join(tmpdir(), "hattah-music");
  mkdirSync(dir, { recursive: true });
  const local = process.env.MUSIC_DIR && path.join(process.env.MUSIC_DIR, track.file);
  if (local && existsSync(local)) return local; // local testing
  const dest = path.join(dir, track.file);
  if (existsSync(dest)) return dest;
  const { data, error } = await sb.storage.from(MUSIC_BUCKET).download(track.file);
  if (error || !data) throw new Error(`music ${track.file}: ${error?.message ?? "empty"}`);
  writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
  return dest;
}

/** Track claims made in this process (a run renders several reels at once, before any of them is saved). */
const claimed: { file: string; at: number; kind: string }[] = [];
const WINDOW = 3 * 86400e3;

/** The track for a reel or a story video scheduled at `scheduledAt`.
 *  • Reels: HARD rule — never a track used by another reel within ±3 days.
 *  • Everything (reels and stories): among the allowed tracks take the one used the FEWEST times within ±3 days across reels AND stories,
 *    then the least recently used. With 11 videos a day and 10 tracks a story can never be fully collision-free; stories simply
 *    minimise repeats (and avoid the tracks of the reels around them first). */
export async function chooseTrack(sb: SupabaseClient, scheduledAt: string | null, excludePostId: string, kind: "reel" | "story" = "reel"): Promise<Track> {
  const all = tracks();
  const at = new Date(scheduledAt ?? Date.now()).getTime();
  const { data } = await sb
    .from("social_posts")
    .select("id, post_type, music_track, scheduled_at")
    .in("post_type", ["reel", "story"])
    .neq("status", "skipped")
    .not("music_track", "is", null)
    .neq("id", excludePostId);
  const uses = [
    ...(data ?? []).map((r) => ({ file: r.music_track as string, at: new Date(r.scheduled_at).getTime(), kind: r.post_type as string })),
    ...claimed,
  ];
  const near = uses.filter((u) => Math.abs(u.at - at) < WINDOW);
  const nearReels = new Set(near.filter((u) => u.kind === "reel").map((u) => u.file));
  const lastUse = (file: string) => Math.max(-Infinity, ...uses.filter((u) => u.file === file).map((u) => u.at));
  const count = (file: string) => near.filter((u) => u.file === file).length;
  let pool = kind === "reel" ? all.filter((t) => !nearReels.has(t.file)) : all;
  if (kind === "reel" && !pool.length) {
    log("⚠ every music track is used by a reel within 3 days — reusing the least recently used one");
    pool = all;
  }
  // stories prefer tracks no reel plays nearby, then the fewest repeats, then the oldest use
  const score = (t: Track) => [kind === "story" && nearReels.has(t.file) ? 1 : 0, count(t.file), lastUse(t.file)];
  const best = [...pool].sort((a, b) => {
    const sa = score(a), sb2 = score(b);
    return sa[0] - sb2[0] || sa[1] - sb2[1] || sa[2] - sb2[2];
  });
  const top = best.filter((t) => score(t).join() === score(best[0]).join());
  const pick = top[Math.floor(Math.random() * top.length)];
  claimed.push({ file: pick.file, at, kind });
  return pick;
}
