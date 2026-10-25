import { FLOW_PATH } from "./templates.js";
import { fetchPhotoDataUri, fontCss, layoutTemplate, logoDataUri, siteDisplay, whatsappDisplay, SIZES, type Renderer } from "./render.js";

const C = { cream: "#F4EBDA", cream2: "#EFE3D0", olive: "#5C6B45", oliveDeep: "#3B4728", terra: "#C17A45", terraDeep: "#A05A2C" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function lattice(color: string, opacity: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g stroke="${color}" stroke-width="1.6" fill="none" opacity="${opacity}"><path d="M0 0L44 44M44 0L0 44"/></g><g fill="${color}" opacity="${opacity}"><circle cx="22" cy="22" r="3.4"/><circle cx="0" cy="0" r="3.4"/><circle cx="44" cy="0" r="3.4"/><circle cx="0" cy="44" r="3.4"/><circle cx="44" cy="44" r="3.4"/></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

const W = 1080;
const H = 1350;

const base = (dark: boolean) => `
${fontCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:'Amiri','Playfair Display',serif;color:${dark ? C.cream : C.oliveDeep}}
.slide{position:relative;width:${W}px;height:${H}px;overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:60px 90px;
  background:${dark ? `radial-gradient(110% 80% at 50% 0%,#4A5A36 0%,${C.oliveDeep} 70%)` : `radial-gradient(120% 90% at 50% 0%,${C.cream} 0%,${C.cream2} 100%)`}}
.tex{position:absolute;inset:0;background-image:${lattice(dark ? "#F4EBDA" : C.olive, dark ? 0.07 : 0.07)};background-repeat:repeat}
.arcs{position:absolute;inset:0;width:100%;height:100%}
.z{position:relative;z-index:2;width:100%;display:flex;flex-direction:column;align-items:center;flex:1;min-height:0}
.logo{width:96px;height:96px;border-radius:50%;box-shadow:0 10px 28px -8px rgba(59,71,40,.35);flex:none}
.fit{overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center;width:100%}
.name{font-weight:700;line-height:1.3}
.flag{display:flex;height:5px;width:64px;border-radius:3px;overflow:hidden;flex:none}
.flag i{flex:1}
.cta{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:25px;line-height:1.45;direction:rtl;flex:none;text-align:center;opacity:.92}
.cta b{font-family:'Playfair Display',serif;font-weight:600;direction:ltr;unicode-bidi:isolate;letter-spacing:.02em}
.rule{display:flex;align-items:center;gap:14px;width:240px;flex:none}
.rule::before,.rule::after{content:"";flex:1;height:2px;background:${C.terra};opacity:.7}
.diamond{width:12px;height:12px;background:${C.terra};transform:rotate(45deg);flex:none}
.dots{display:flex;gap:10px;flex:none}
.dots i{width:12px;height:12px;border-radius:50%;background:${dark ? C.cream : C.olive};opacity:.3}
.dots i.on{opacity:1;background:${C.terra};width:30px;border-radius:8px}
`;
const arcs = (dark: boolean) =>
  `<svg class="arcs" viewBox="0 0 1080 1350" preserveAspectRatio="none"><path d="M-40 420 A460 460 0 0 1 420 -40" fill="none" stroke="${dark ? "#8A9A6C" : C.olive}" stroke-width="3" stroke-linecap="round" opacity=".5"/><path d="M1120 980 A460 460 0 0 1 660 1390" fill="none" stroke="${C.terra}" stroke-width="3" stroke-linecap="round" opacity=".6"/></svg>`;
const flagBar = `<div class="flag"><i style="background:#111"></i><i style="background:#2E7D4F"></i><i style="background:#C8323B"></i></div>`;
const waLine = (storeUrl?: string) =>
  `<div class="cta"><div>اطلب من المتجر: <b>${esc(siteDisplay(storeUrl))}</b></div><div>أو عبر واتساب: <b>${esc(whatsappDisplay())}</b></div></div>`;
const dots = (i: number, n: number) => `<div class="dots">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>`;

/** Continuation of slide 1's arc: the same path viewed through the second slide's window (x 1080–2160). */
const flowIn = () =>
  `<svg class="arcs" viewBox="1080 0 1080 1350" preserveAspectRatio="none"><defs><linearGradient id="fadeB" gradientUnits="userSpaceOnUse" x1="1080" y1="0" x2="1470" y2="0"><stop offset="0" stop-color="${C.terra}" stop-opacity=".9"/><stop offset=".45" stop-color="${C.terra}" stop-opacity=".7"/><stop offset="1" stop-color="${C.terra}" stop-opacity="0"/></linearGradient></defs><path d="${FLOW_PATH}" fill="none" stroke="url(#fadeB)" stroke-width="3" stroke-linecap="round"/></svg>`;

const SHAPES = ["300px 300px 28px 28px", "40px", "50%", "28px 28px 300px 300px"];

export interface PhotoSlide {
  /** First photo slide: the arc that left slide 1 continues here (same path, shifted by one slide width). */
  flowIn?: boolean;
  photoUrl: string;
  nameAr: string;
  index: number; // 0-based position among all slides
  total: number;
  storeUrl?: string;
  /** shape rotation so consecutive photo slides do not look identical */
  variant?: number;
}

export interface DetailsSlide {
  nameAr: string;
  categoryAr: string;
  price: number;
  oldPrice: number | null;
  /** Emoji-led detail lines written with the caption (material, use, care…). */
  details: string[];
  /** Short option labels (sizes, colours, quantity options). */
  options: string[];
  index: number;
  total: number;
  storeUrl?: string;
}

function photoHtml(s: PhotoSlide, photo: string): string {
  const shape = SHAPES[(s.variant ?? s.index) % SHAPES.length];
  const round = shape === "50%";
  const w = round ? 800 : 880;
  const h = round ? 800 : 940;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${base(false)}
.photo{width:${w}px;height:${h}px;border-radius:${shape};overflow:hidden;border:10px solid #FBF5E9;background:#fff;box-shadow:0 30px 60px -22px rgba(59,71,40,.55),0 6px 16px -6px rgba(59,71,40,.3);flex:none}
.photo img{width:100%;height:100%;object-fit:cover;display:block}
</style></head><body><div class="slide"><div class="tex"></div>${arcs(false)}${s.flowIn ? flowIn() : ""}
<div class="z" style="gap:18px">
  <img class="logo" src="${logoDataUri()}">
  <div class="photo" style="margin-top:auto"><img src="${photo}"></div>
  <div class="fit name" data-max="44" data-min="24" style="height:64px;color:${C.oliveDeep};margin-top:auto"><span>${esc(s.nameAr)}</span></div>
  ${dots(s.index, s.total)}
</div></div></body></html>`;
}

function detailsHtml(s: DetailsSlide): string {
  const lines = s.details.map((d) => `<div style="margin:6px 0">${esc(d)}</div>`).join("");
  const chips = s.options
    .slice(0, 8)
    .map((o) => `<span style="display:inline-block;margin:5px 6px;padding:2px 20px 6px;border:2px solid ${C.terra};border-radius:40px;font-size:28px;color:${C.cream}">${esc(o)}</span>`)
    .join("");
  const old = s.oldPrice ? `<span style="font-family:'Playfair Display',serif;text-decoration:line-through;opacity:.6;font-size:34px;margin-inline-end:18px">${fmt(s.oldPrice)} TL</span>` : "";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${base(true)}</style></head><body><div class="slide"><div class="tex"></div>${arcs(true)}
<div class="z" style="gap:16px">
  <img class="logo" src="${logoDataUri()}">
  <div style="font-size:40px;color:#E3C9A0;font-weight:700">تفاصيل المنتج</div>
  <div class="rule"><span class="diamond"></span></div>
  <div class="fit name" data-max="48" data-min="26" style="height:74px;color:${C.cream}"><span>${esc(s.nameAr)}</span></div>
  <div class="fit" data-max="34" data-min="22" style="height:${s.options.length ? 360 : 440}px;line-height:1.55;color:${C.cream};font-weight:400;align-items:flex-start"><span style="display:block;width:100%;text-align:right">${lines}</span></div>
  ${chips ? `<div style="text-align:center;width:100%;direction:rtl">${chips}</div>` : ""}
  <div style="display:flex;align-items:baseline;justify-content:center;direction:ltr;background:${C.terraDeep};color:${C.cream};padding:4px 54px 10px;border-radius:80px;box-shadow:0 14px 30px -14px rgba(160,90,44,.8);margin-top:auto">${old}<span style="font-family:'Playfair Display',serif;font-weight:700;font-size:54px">${fmt(s.price)} <span style="font-size:28px">TL</span></span></div>
  ${flagBar}
  ${waLine(s.storeUrl)}
  ${dots(s.index, s.total)}
</div></div></body></html>`;
}

async function shoot(renderer: Renderer, html: string): Promise<Buffer> {
  const page = await renderer.openPage(SIZES.carousel);
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await layoutTemplate(page);
    return (await page.screenshot({ type: "jpeg", quality: 92, clip: { x: 0, y: 0, width: W, height: H } })) as Buffer;
  } finally {
    await page.close();
  }
}

export async function renderPhotoSlide(renderer: Renderer, s: PhotoSlide): Promise<Buffer> {
  return shoot(renderer, photoHtml(s, await fetchPhotoDataUri(s.photoUrl)));
}

export async function renderDetailsSlide(renderer: Renderer, s: DetailsSlide): Promise<Buffer> {
  return shoot(renderer, detailsHtml(s));
}
