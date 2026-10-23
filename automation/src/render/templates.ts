import type { Angle, DesignText, PostType } from "../types.js";

export interface TemplateInput {
  type: PostType;
  angle: Angle;
  nameAr: string;
  categoryAr: string;
  price: number;
  oldPrice: number | null;
  /** data: URI of the product photo (JPEG). */
  photo: string;
  /** data: URI of a background-removed PNG of the product, when remove_bg is on and succeeded. */
  cutout: string | null;
  /** data: URI of the official logo. */
  logo: string;
  fontCss: string;
  whatsappDisplay: string;
  text: DesignText;
}

const C = {
  cream: "#F4EBDA",
  cream2: "#EFE3D0",
  olive: "#5C6B45",
  oliveDeep: "#3B4728",
  terra: "#C17A45",
  terraDeep: "#A05A2C",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Keffiyeh fishnet lattice, tiled — used only as a faint texture/frame. */
function lattice(color: string, opacity: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g stroke="${color}" stroke-width="1.6" fill="none" opacity="${opacity}"><path d="M0 0L44 44M44 0L0 44"/></g><g fill="${color}" opacity="${opacity}"><circle cx="22" cy="22" r="3.4"/><circle cx="0" cy="0" r="3.4"/><circle cx="44" cy="0" r="3.4"/><circle cx="0" cy="44" r="3.4"/><circle cx="44" cy="44" r="3.4"/></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/** Palestine flag colours, used only as a tiny accent bar. */
const flagBar = `<div class="flag"><i style="background:#111"></i><i style="background:#2E7D4F"></i><i style="background:#C8323B"></i></div>`;

const arcs = (dark: boolean) => `
<svg class="arcs" viewBox="0 0 1080 1920" preserveAspectRatio="none" aria-hidden="true">
  <path d="M-40 520 A560 560 0 0 1 520 -40" fill="none" stroke="${dark ? "#8A9A6C" : C.olive}" stroke-width="3" stroke-linecap="round" opacity="${dark ? 0.55 : 0.5}"/>
  <path d="M1120 1400 A560 560 0 0 1 560 1960" fill="none" stroke="${C.terra}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
</svg>`;

const baseCss = (t: TemplateInput) => {
  const H = t.type === "feed" ? 1350 : 1920;
  const story = t.type === "story";
  return `
${t.fontCss}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:${H}px;overflow:hidden}
body{font-family:'Amiri','Playfair Display',serif;color:${C.oliveDeep}}
.canvas{position:relative;width:1080px;height:${H}px;overflow:hidden;
  background:radial-gradient(120% 90% at 50% 0%,${C.cream} 0%,${C.cream2} 100%);
  display:flex;flex-direction:column;align-items:center;
  padding:${story ? "250px 96px 250px" : "64px 96px 64px"}}
.canvas.dark{background:radial-gradient(110% 80% at 50% 0%,#4A5A36 0%,${C.oliveDeep} 70%);color:${C.cream}}
.tex{position:absolute;inset:0;background-repeat:repeat;pointer-events:none}
.arcs{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.z{position:relative;z-index:2;width:100%}
.logo{width:${story ? 150 : 104}px;height:${story ? 150 : 104}px;border-radius:50%;display:block;
  box-shadow:0 10px 28px -8px rgba(59,71,40,.35);flex:none}
.flag{display:flex;height:5px;width:64px;border-radius:3px;overflow:hidden;flex:none}
.flag i{flex:1}
.photo{position:relative;overflow:hidden;background:#fff;
  box-shadow:0 30px 60px -22px rgba(59,71,40,.55),0 6px 16px -6px rgba(59,71,40,.3)}
.photo img{width:100%;height:100%;object-fit:cover;display:block}
.photo.cut{background:radial-gradient(75% 65% at 50% 42%,#FCF7EC 0%,#EFE2C8 100%);box-shadow:inset 0 0 0 2px rgba(193,122,69,.18)}
.photo.cut .cutimg{position:absolute;width:auto;height:auto;object-fit:contain;z-index:2;filter:drop-shadow(0 16px 14px rgba(59,71,40,.32))}
.photo.cut .ground{position:absolute;z-index:1;border-radius:50%;background:radial-gradient(closest-side,rgba(59,71,40,.42),rgba(59,71,40,0));filter:blur(5px)}
.fit{overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center;width:100%}
.name{font-weight:700;line-height:1.32}
.cat{font-size:${story ? 34 : 28}px;color:${C.terraDeep};letter-spacing:.02em}
.price{font-family:'Playfair Display','Amiri',serif;font-weight:700;direction:ltr;white-space:nowrap}
.old{font-family:'Playfair Display','Amiri',serif;text-decoration:line-through;opacity:.6;direction:ltr}
.wa{display:flex;align-items:center;justify-content:center;gap:14px;font-size:${story ? 36 : 30}px;direction:rtl;flex:none}
.wa b{font-family:'Playfair Display',serif;font-weight:600;direction:ltr;unicode-bidi:isolate;letter-spacing:.03em}
.wa .dot{width:7px;height:7px;border-radius:50%;background:${C.terra}}
.diamond{width:12px;height:12px;background:${C.terra};transform:rotate(45deg);flex:none}
.rule{display:flex;align-items:center;gap:14px;width:240px;flex:none}
.rule::before,.rule::after{content:"";flex:1;height:2px;background:${C.terra};opacity:.55}
.dark .rule::before,.dark .rule::after{opacity:.8}
`;
};

/** Hero photo container. With a cut-out the product sits on a soft brand-cream
 * backdrop with a natural ground shadow (positioned in render.ts); otherwise
 * the original photo is shown in a clean rounded frame. */
function photoBox(
  t: TemplateInput,
  o: { w: number | string; h: number | string; radius: string; border?: string; extra?: string; round?: boolean },
): string {
  const size = `width:${typeof o.w === "number" ? o.w + "px" : o.w};height:${typeof o.h === "number" ? o.h + "px" : o.h};border-radius:${o.radius};${o.extra ?? ""}`;
  if (t.cutout) {
    return `<div class="photo cut${o.round ? " round" : ""}" style="${size}"><i class="ground"></i><img class="cutimg" src="${t.cutout}"></div>`;
  }
  return `<div class="photo" style="${size};${o.border ? "border:" + o.border + ";" : ""}"><img src="${t.photo}"></div>`;
}

const waLine = (t: TemplateInput) =>
  `<div class="wa"><span>اطلب عبر واتساب</span><span class="dot"></span><b>${esc(t.whatsappDisplay)}</b></div>`;

const priceBlock = (t: TemplateInput, size: number, color: string) => {
  const old = t.oldPrice
    ? `<span class="old" style="font-size:${Math.round(size * 0.55)}px;color:${color}">${fmt(t.oldPrice)} TL</span>`
    : "";
  return `<div style="display:flex;align-items:baseline;justify-content:center;gap:22px;direction:ltr">${old}<span class="price" style="font-size:${size}px;color:${color}">${fmt(t.price)} <span style="font-size:${Math.round(size * 0.52)}px">TL</span></span></div>`;
};

/* ───────────── 1. Showcase — arch-framed hero photo ───────────── */
function showcase(t: TemplateInput): string {
  const story = t.type === "story";
  const r = story ? 380 : 330;
  return `
<div class="canvas">
  <div class="tex" style="background-image:${lattice(C.olive, 0.07)}"></div>
  ${arcs(false)}
  <div class="z" style="display:flex;flex-direction:column;align-items:center;gap:${story ? 30 : 16}px;flex:1;min-height:0">
    <img class="logo" src="${t.logo}">
    ${photoBox(t, { w: story ? 760 : 660, h: story ? 760 : 650, radius: `${r}px ${r}px 28px 28px`, border: "10px solid #FBF5E9", extra: "flex:none;" })}
    <div class="cat">${esc(t.categoryAr)}</div>
    <div class="fit name" data-max="${story ? 56 : 50}" data-min="26" style="height:${story ? 170 : 128}px;color:${C.oliveDeep}"><span>${esc(t.nameAr)}</span></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:${story ? 26 : 12}px;margin-top:auto">
      <div style="background:${C.olive};color:${C.cream};padding:${story ? "8px 52px 12px" : "4px 40px 8px"};border-radius:80px">${priceBlock(t, story ? 60 : 46, C.cream)}</div>
      ${flagBar}
      ${waLine(t)}
    </div>
  </div>
</div>`;
}

/* ───────────── 2. Heritage — photo arch + story line ───────────── */
function heritage(t: TemplateInput): string {
  const story = t.type === "story";
  const line = t.text.heritage || "كل قطعة تحمل حكاية، ويد صنعتها بحب وصبر حتى تصل إليك.";
  const photo = story
    ? photoBox(t, { w: 640, h: 480, radius: "320px 320px 26px 26px", border: "10px solid #FBF5E9", extra: "flex:none;" })
    : photoBox(t, { w: 400, h: "100%", radius: "200px 200px 26px 26px", border: "10px solid #FBF5E9", extra: "flex:none;" });
  const textCol = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${story ? 20 : 18}px;flex:1;min-width:0;height:${story ? "auto" : "100%"};${story ? "width:100%" : ""}">
      <div style="font-size:${story ? 34 : 26}px;color:${C.terraDeep};letter-spacing:.04em;text-align:center">من تراثنا · ${esc(t.categoryAr)}</div>
      <div class="rule"><span class="diamond"></span></div>
      <div class="fit" data-max="${story ? 52 : 44}" data-min="24" style="height:${story ? 250 : 400}px;line-height:1.75;color:${C.oliveDeep};font-weight:400"><span>${esc(line)}</span></div>
      <div class="rule"><span class="diamond"></span></div>
      <div class="fit name" data-max="${story ? 42 : 34}" data-min="22" style="height:${story ? 110 : 120}px;color:${C.olive}"><span>${esc(t.nameAr)}</span></div>
      ${priceBlock(t, story ? 56 : 42, C.terraDeep)}
    </div>`;
  return `
<div class="canvas">
  <div class="tex" style="background-image:${lattice(C.olive, 0.06)}"></div>
  ${arcs(false)}
  <div class="z" style="display:flex;flex-direction:column;align-items:center;gap:${story ? 22 : 16}px;flex:1;min-height:0">
    <img class="logo" src="${t.logo}">
    ${
      story
        ? photo + textCol
        : `<div style="display:flex;flex-direction:row;gap:44px;flex:1;min-height:0;width:100%;direction:rtl">${textCol}${photo}</div>`
    }
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;flex:none;${story ? "margin-top:auto" : ""}">${flagBar}${waLine(t)}</div>
  </div>
</div>`;
}

/* ───────────── 3. Quote — deep olive, big typographic line ───────────── */
function quote(t: TemplateInput): string {
  const story = t.type === "story";
  const q = t.text.quote || "من يدٍ إلى يد، ومن بيتٍ إلى بيت… تبقى الحكاية.";
  const size = story ? 340 : 300;
  return `
<div class="canvas dark">
  <div class="tex" style="background-image:${lattice("#F4EBDA", 0.07)}"></div>
  ${arcs(true)}
  <div class="z" style="display:flex;flex-direction:column;align-items:center;gap:${story ? 28 : 16}px;flex:1;min-height:0">
    <img class="logo" src="${t.logo}">
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${story ? 24 : 12}px;width:100%;min-height:0">
      <div style="font-family:'Playfair Display',serif;font-size:${story ? 160 : 110}px;line-height:.6;color:${C.terra};height:${story ? 80 : 54}px">“</div>
      <div class="fit" data-max="${story ? 72 : 62}" data-min="30" style="height:${story ? 420 : 280}px;line-height:1.7;color:${C.cream};font-weight:400"><span>${esc(q)}</span></div>
    </div>
    <div class="rule"><span class="diamond"></span></div>
    <div style="display:flex;align-items:center;gap:${story ? 36 : 30}px;direction:rtl;width:100%;justify-content:center;margin-top:${story ? 10 : 2}px">
      ${photoBox(t, { w: size, h: size, radius: "50%", border: `8px solid ${C.cream}`, extra: "flex:none;", round: true })}
      <div style="display:flex;flex-direction:column;align-items:center;gap:${story ? 18 : 10}px;width:${story ? 470 : 460}px">
        <div class="fit name" data-max="${story ? 44 : 38}" data-min="22" style="height:${story ? 190 : 150}px;color:${C.cream}"><span>${esc(t.nameAr)}</span></div>
        ${priceBlock(t, story ? 52 : 44, "#E3A56E")}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:${story ? 30 : 16}px">${flagBar}${waLine(t)}</div>
  </div>
</div>`;
}

/* ───────────── 4. Offer / price highlight ───────────── */
function offer(t: TemplateInput): string {
  const story = t.type === "story";
  const onSale = !!t.oldPrice && t.oldPrice > t.price;
  const pct = onSale ? Math.round((1 - t.price / t.oldPrice!) * 100) : 0;
  const badge = onSale ? `خصم <bdi dir="ltr" style="font-family:'Playfair Display',serif">${pct}%</bdi>` : "اطلبها الآن";
  const photoH = story ? 1020 : 770;
  const radius = "0 0 540px 540px / 0 0 120px 120px";
  const hero = t.cutout
    ? photoBox(t, { w: 1080, h: photoH, radius, extra: "position:absolute;top:0;left:0;" })
    : `<div class="photo" style="position:absolute;top:0;left:0;width:1080px;height:${photoH}px;border-radius:${radius};box-shadow:0 24px 50px -24px rgba(59,71,40,.6)"><img src="${t.photo}"></div>`;
  return `
<div class="canvas" style="padding:0">
  <div class="tex" style="background-image:${lattice(C.olive, 0.05)}"></div>
  ${hero}
  <img class="logo" src="${t.logo}" style="position:absolute;top:${story ? 260 : 70}px;left:96px;z-index:3;border:5px solid #FBF5E9">
  <div class="logo" style="position:absolute;top:${story ? 275 : 82}px;right:96px;z-index:3;width:auto;height:auto;border-radius:60px;background:${C.terraDeep};color:${C.cream};font-size:${story ? 40 : 34}px;font-weight:700;padding:6px 32px 10px;box-shadow:0 10px 24px -10px rgba(0,0,0,.5)">${badge}</div>
  <div style="position:absolute;left:0;right:0;top:${photoH}px;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:${story ? 22 : 10}px;padding:${story ? "30px 96px 250px" : "22px 96px 64px"}">
    <div class="cat">${esc(t.categoryAr)}</div>
    <div class="fit name" data-max="${story ? 52 : 42}" data-min="24" style="height:${story ? 150 : 100}px;color:${C.oliveDeep}"><span>${esc(t.nameAr)}</span></div>
    <div style="background:${C.terraDeep};color:${C.cream};padding:${story ? "12px 64px 18px" : "4px 52px 10px"};border-radius:90px;box-shadow:0 14px 30px -14px rgba(160,90,44,.8)">${priceBlock(t, story ? 92 : 66, C.cream)}</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:auto">${flagBar}${waLine(t)}</div>
  </div>
</div>`;
}

export function buildHtml(t: TemplateInput): string {
  const body =
    t.angle === "heritage" ? heritage(t) : t.angle === "quote" ? quote(t) : t.angle === "offer" ? offer(t) : showcase(t);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${baseCss(t)}</style></head><body>${body}</body></html>`;
}
