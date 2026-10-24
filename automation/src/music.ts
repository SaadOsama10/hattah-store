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
const claimed: { file: string; at: number }[] = [];
const WINDOW = 3 * 86400e3;

/** The track for a reel scheduled at `scheduledAt`: never one used by another reel within ±3 days; among the allowed ones the
 * least recently used (so tracks simply rotate). If every track is taken inside the window (more than ~10 reels in 6 days),
 * the least recently used one is reused and a warning is logged. */
export async function chooseTrack(sb: SupabaseClient, scheduledAt: string | null, excludePostId: string): Promise<Track> {
  const all = tracks();
  const at = new Date(scheduledAt ?? Date.now()).getTime();
  const { data } = await sb
    .from("social_posts")
    .select("id, music_track, scheduled_at")
    .eq("post_type", "reel")
    .neq("status", "skipped")
    .not("music_track", "is", null)
    .neq("id", excludePostId);
  const uses = [...(data ?? []).map((r) => ({ file: r.music_track as string, at: new Date(r.scheduled_at).getTime() })), ...claimed];
  const near = new Set(uses.filter((u) => Math.abs(u.at - at) < WINDOW).map((u) => u.file));
  const lastUse = (file: string) => Math.max(-Infinity, ...uses.filter((u) => u.file === file).map((u) => u.at));
  const free = all.filter((t) => !near.has(t.file));
  if (!free.length) log(`⚠ every music track is used within 3 days of this reel — reusing the least recently used one`);
  const pool = free.length ? free : all;
  const oldest = Math.min(...pool.map((t) => lastUse(t.file)));
  const ties = pool.filter((t) => lastUse(t.file) === oldest);
  const pick = ties[Math.floor(Math.random() * ties.length)];
  claimed.push({ file: pick.file, at });
  return pick;
}
