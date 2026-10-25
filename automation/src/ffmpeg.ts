import { existsSync } from "node:fs";
import { createRequire } from "node:module";

/** ffmpeg binary: the bundled static build (`ffmpeg-static`, no apt needed on the runner) or the system one. */
export function ffmpegBin(): string {
  try {
    const p = createRequire(import.meta.url)("ffmpeg-static") as string | null;
    if (p && existsSync(p)) return p;
  } catch {
    /* fall through to the system binary */
  }
  return "ffmpeg";
}
