import { chromium, type Browser } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { getCutoutDataUri } from "./cutout.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildHtml, type TemplateInput } from "./templates.js";
import type { Angle, DesignText, PostType } from "../types.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const FONT_FILES: [string, string, string, string, string?][] = [
  // family, file, weight, style, unicode-range
  ["Amiri", "amiri-arabic-400-normal.woff2", "400", "normal", "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC"],
  ["Amiri", "amiri-arabic-700-normal.woff2", "700", "normal", "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC"],
  ["Amiri", "amiri-latin-400-normal.woff2", "400", "normal", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"],
  ["Amiri", "amiri-latin-700-normal.woff2", "700", "normal", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"],
  ["Playfair Display", "playfair-display-latin-400-normal.woff2", "400", "normal"],
  ["Playfair Display", "playfair-display-latin-600-normal.woff2", "600", "normal"],
  ["Playfair Display", "playfair-display-latin-700-normal.woff2", "700", "normal"],
  ["Playfair Display", "playfair-display-latin-400-italic.woff2", "400", "italic"],
];

let fontCssCache: string | null = null;
/** Fonts are bundled in /automation/fonts and inlined as data URIs — no
 * network (Google Fonts or otherwise) is ever needed at render time. */
function fontCss(): string {
  if (fontCssCache) return fontCssCache;
  fontCssCache = FONT_FILES.map(([family, file, weight, style, range]) => {
    const b64 = readFileSync(path.join(ROOT, "fonts", file)).toString("base64");
    return `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${b64}) format('woff2');${range ? `unicode-range:${range};` : ""}}`;
  }).join("\n");
  return fontCssCache;
}

let logoCache: string | null = null;
/** The official logo, embedded untouched (no crop / recolor / redraw). */
function logoDataUri(): string {
  if (!logoCache) {
    logoCache = `data:image/jpeg;base64,${readFileSync(path.join(ROOT, "logo.jpg")).toString("base64")}`;
  }
  return logoCache;
}

export async function fetchPhotoDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photo download failed (${res.status}): ${url}`);
  const raw = Buffer.from(await res.arrayBuffer());
  // Normalize webp/avif/png/etc. to a bounded JPEG so Chromium decodes it
  // instantly and the render is deterministic.
  const jpeg = await sharp(raw)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 90 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

export interface RenderRequest {
  type: PostType;
  angle: Angle;
  nameAr: string;
  categoryAr: string;
  price: number;
  oldPrice: number | null;
  photoUrl: string;
  text: DesignText;
  /** Cut the product out of its photo (per-product option). */
  removeBg?: boolean;
}

export const SIZES: Record<PostType, { width: number; height: number }> = {
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

export function whatsappDisplay(): string {
  const d = (process.env.WHATSAPP_NUMBER ?? "905529987112").replace(/\D/g, "");
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
  return `+${d}`;
}

export class Renderer {
  private browser: Browser | null = null;
  lastViolations = 0;
  constructor(private sb: SupabaseClient | null = null) {}

  async open() {
    if (!this.browser) this.browser = await chromium.launch();
  }

  async close() {
    await this.browser?.close();
    this.browser = null;
  }

  async render(req: RenderRequest): Promise<Buffer> {
    await this.open();
    const input: TemplateInput = {
      type: req.type,
      angle: req.angle,
      nameAr: req.nameAr,
      categoryAr: req.categoryAr,
      price: req.price,
      oldPrice: req.oldPrice,
      photo: await fetchPhotoDataUri(req.photoUrl),
      cutout: req.removeBg ? await getCutoutDataUri(this.sb, req.photoUrl) : null,
      logo: logoDataUri(),
      fontCss: fontCss(),
      whatsappDisplay: whatsappDisplay(),
      text: req.text,
    };
    const size = SIZES[req.type];
    const page = await this.browser!.newPage({ viewport: size, deviceScaleFactor: 1 });
    try {
      await page.setContent(buildHtml(input), { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      // Shrink long text until it fits its box (Arabic names vary a lot).
      await page.evaluate(() => {
        document.querySelectorAll<HTMLElement>(".fit").forEach((box) => {
          let size = Number(box.dataset.max) || 48;
          const min = Number(box.dataset.min) || 20;
          box.style.fontSize = `${size}px`;
          const inner = box.firstElementChild as HTMLElement;
          while (
            size > min &&
            (inner.scrollHeight > box.clientHeight + 1 || inner.scrollWidth > box.clientWidth + 1)
          ) {
            size -= 2;
            box.style.fontSize = `${size}px`;
          }
        });
      });
      // Stand the cut-out on a ground line with a soft contact shadow.
      await page.evaluate(async () => {
        for (const box of Array.from(document.querySelectorAll<HTMLElement>(".photo.cut"))) {
          const img = box.querySelector<HTMLImageElement>(".cutimg")!;
          const ground = box.querySelector<HTMLElement>(".ground")!;
          await img.decode();
          const round = box.classList.contains("round");
          const bw = box.clientWidth, bh = box.clientHeight;
          const scale = Math.min((bw * (round ? 0.7 : 0.84)) / img.naturalWidth, (bh * (round ? 0.62 : 0.74)) / img.naturalHeight, 1.8);
          const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
          const base = Math.min(bh * (round ? 0.78 : 0.9), bh * 0.5 + h / 2 + bh * 0.04);
          img.style.width = `${w}px`; img.style.height = `${h}px`;
          img.style.left = `${(bw - w) / 2}px`; img.style.top = `${base - h}px`;
          const gw = w * 0.92, gh = Math.max(20, bh * 0.055);
          ground.style.width = `${gw}px`; ground.style.height = `${gh}px`;
          ground.style.left = `${(bw - gw) / 2}px`; ground.style.top = `${base - gh * 0.55}px`;
        }
      });
      const violations = await page.evaluate(
        ({ W, H, top, bottom, side }) => {
          const bad: string[] = [];
          document.querySelectorAll<HTMLElement>(".logo,.fit>span,.wa,.cat,.price,.old,.flag").forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.left < side - 1 || r.right > W - side + 1 || r.top < top - 1 || r.bottom > H - bottom + 1)
              bad.push(`${el.className || el.tagName} [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}] "${(el.textContent ?? "").slice(0, 24)}"`);
          });
          return bad;
        },
        { W: size.width, H: size.height, top: req.type === "story" ? 250 : 60, bottom: req.type === "story" ? 250 : 60, side: 90 },
      );
      if (violations.length) console.warn(`[render] SAFE-AREA violations (${req.type}/${req.angle}):\n  ` + violations.join("\n  "));
      this.lastViolations = violations.length;
      const overflow = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>(".fit")).filter((b) => {
          const i = b.firstElementChild as HTMLElement;
          return i.scrollHeight > b.clientHeight + 1;
        }).length,
      );
      if (overflow) console.warn(`[render] ${overflow} text box(es) still overflow at minimum size`);
      return (await page.screenshot({ type: "jpeg", quality: 92, clip: { x: 0, y: 0, ...size } })) as Buffer;
    } finally {
      await page.close();
    }
  }
}
