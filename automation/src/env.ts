import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Loads automation/.env (local runs). In GitHub Actions the variables come
 * from repository secrets, so a missing file is fine. */
export function loadEnv() {
  for (const file of [".env", "../.env.local"]) {
    const p = path.resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  // The store's .env.local uses NEXT_PUBLIC_SUPABASE_URL
  process.env.SUPABASE_URL ??= process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const isDryRun = () => process.env.DRY_RUN === "true";
