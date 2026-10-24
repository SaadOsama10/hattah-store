import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MUSIC_BUCKET = "social-music";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface Track {
  file: string;
  title: string;
  artist: string;
  source: string;
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
