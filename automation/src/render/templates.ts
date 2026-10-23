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
  padding:${story ? "150px 80px 190px" : "56px 70px 52px"}}
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
  const photoH = story ? 960 : 640;
  return `
<div class="canvas">
  <div class="tex" style="background-image:${lattice(C.olive, 0.07)}"></div>
  ${arcs(false)}
  <div class="z" style="display:flex;flex-direction:column;align-items:center;gap:${story ? 36 : 22}px;flex:1">
    <img class="logo" src="${t.logo}">
    <div class="photo" style="width:${story ? 860 : 700}px;height:${photoH}px;border-radius:${story ? 430 : 350}px ${story ? 430 : 350}px 28px 28px;flex:none;border:10px solid #FBF5E9">
      <img src="${t.photo}">
    </div>
    <div class="cat">${esc(t.categoryAr)}</div>
    <div class="fit name" data-max="${story ? 56 : 52}" data-min="26" style="height:${story ? 190 : 142}px;color:${C.oliveDeep}"><span>${esc(t.nameAr)}</span></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:${story ? 28 : 16}px;margin-top:auto">
      <div style="background:${C.olive};color:${C.cream};padding:${story ? "10px 56px 14px" : "6px 44px 10px"};border-radius:80px">${priceBlock(t, story ? 64 : 50, C.cream)}</div>
      ${flagBar}
      ${waLine(t)}
    </div>
  </div>
</div>`;
}

/* ───────────── 2. Heritage — photo arch + story line ───────────── */
function heritage(t: TemplateInput): string {
  const story = t.type === "story";
  const line =
    t.text.heritage ||
    "كل قطعة تحمل حكاية، ويد صنعتها بحب وصبر حتى تصل إليك.";
  const photo = `<div class="photo" style="${
    story
      ? "width:700px;height:640px;border-radius:350px 350px 28px 28px"
      : "width:470px;height:100%;border-radius:235px 235px 28px 28px"
  };flex:none;border:10px solid #FBF5E9"><img src="${t.photo}"></div>`;
  const textCol = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${story ? 26 : 24}px;flex:1;min-width:0;height:${story ? "auto" : "100%"};${story ? "width:100%" : ""}">
      <div style="font-size:${story ? 36 : 28}px;color:${C.terraDeep};letter-spacing:.04em">من تراثنا · ${esc(t.categoryAr)}</div>
      <div class="rule"><span class="diamond"></span></div>
      <div class="fit" data-max="${story ? 56 : 50}" data-min="24" style="height:${story ? 300 : 430}px;line-height:1.75;color:${C.oliveDeep};font-weight:400"><span>${esc(line)}</span></div>
      <div class="rule"><span class="diamond"></span></div>
      <div class="fit name" data-max="${story ? 46 : 38}" data-min="22" style="height:${story ? 120 : 110}px;color:${C.olive}"><span>${esc(t.nameAr)}</span></div>
      ${priceBlock(t, story ? 60 : 46, C.terraDeep)}
    </div>`;
  return `
<div class="canvas">
  <div class="tex" style="background-image:${lattice(C.olive, 0.06)}"></div>
  ${arcs(false)}
  <div class="z" style="display:flex;flex-direction:column;align-items:center;gap:${story ? 30 : 20}px;flex:1;min-height:0">
    <img class="logo" src="${t.logo}">
    ${
      story
        ? photo + textCol
        : `<div style="display:flex;flex-direction:row;gap:50px;flex:1;min-height:0;width:100%;direction:rtl">${textCol}${photo}</div>`
    }
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;flex:none;${story ? "margin-top:auto" : ""}">${flagBar}${waLine(t)}</div>
  </div>
</div>`;
}

/* ───────────── 3. Quote — deep olive, big typographic line ───────────── */
function quote(t: TemplateInput): string {
  const story = t.type === "story";
  const q = t.text.quote || "من يدٍ إلى يد، ومن بيتٍ إلى بيت… تبقى الحكاية.";
  const size = story ? 420 : 360;
  return `
<div class="canvas dark">
  <div class="tex" style="background-image:${lattice("#F4EBDA", 0.07)}"></div>
  ${arcs(true)}
  <div class="z" style="display:flex;flex-direction:column;align-items:center;gap:${story ? 40 : 24}px;flex:1;min-height:0">
    <img class="logo" src="${t.logo}">
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${story ? 30 : 16}px;width:100%;min-height:0">
      <div style="font-family:'Playfair Display',serif;font-size:${story ? 190 : 130}px;line-height:.6;color:${C.terra};height:${story ? 90 : 60}px">“</div>
      <div class="fit" data-max="${story ? 84 : 70}" data-min="30" style="height:${story ? 560 : 330}px;line-height:1.7;color:${C.cream};font-weight:400;padding:0 20px"><span>${esc(q)}</span></div>
    </div>
    <div class="rule"><span class="diamond"></span></div>
    <div style="display:flex;align-items:center;gap:${story ? 50 : 36}px;direction:rtl;width:100%;justify-content:center;margin-top:${story ? 20 : 4}px">
      <div class="photo" style="width:${size}px;height:${size}px;border-radius:50%;border:8px solid ${C.cream};flex:none"><img src="${t.photo}"></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:${story ? 22 : 12}px;width:${story ? 440 : 400}px">
        <div class="fit name" data-max="${story ? 46 : 40}" data-min="22" style="height:${story ? 190 : 150}px;color:${C.cream}"><span>${esc(t.nameAr)}</span></div>
        ${priceBlock(t, story ? 56 : 46, "#E3A56E")}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:${story ? 50 : 28}px">${flagBar}${waLine(t)}</div>
  </div>
</div>`;
}

/* ───────────── 4. Offer / price highlight ───────────── */
function offer(t: TemplateInput): string {
  const story = t.type === "story";
  const onSale = !!t.oldPrice && t.oldPrice > t.price;
  const pct = onSale ? Math.round((1 - t.price / t.oldPrice!) * 100) : 0;
  const badge = onSale ? `خصم <bdi dir="ltr" style="font-family:'Playfair Display',serif">${pct}%</bdi>` : "اطلبها الآن";
  const photoH = story ? 1100 : 790;
  return `
<div class="canvas" style="padding:0">
  <div class="tex" style="background-image:${lattice(C.olive, 0.05)}"></div>
  <div class="photo" style="position:absolute;top:0;left:0;width:1080px;height:${photoH}px;border-radius:0 0 540px 540px / 0 0 120px 120px;box-shadow:0 24px 50px -24px rgba(59,71,40,.6)"><img src="${t.photo}"></div>
  <img class="logo" src="${t.logo}" style="position:absolute;top:${story ? 130 : 44}px;left:${story ? 70 : 48}px;z-index:3;border:5px solid #FBF5E9">
  <div style="position:absolute;top:${story ? 150 : 56}px;right:${story ? 70 : 48}px;z-index:3;background:${C.terraDeep};color:${C.cream};font-size:${story ? 44 : 36}px;font-weight:700;padding:8px 34px 12px;border-radius:60px;box-shadow:0 10px 24px -10px rgba(0,0,0,.5)">${badge}</div>
  <div style="position:absolute;left:0;right:0;top:${photoH}px;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:${story ? "center" : "flex-start"};gap:${story ? 34 : 12}px;padding:${story ? "20px 80px 190px" : "26px 70px 40px"}">
    <div class="cat">${esc(t.categoryAr)}</div>
    <div class="fit name" data-max="${story ? 56 : 46}" data-min="24" style="height:${story ? 170 : 108}px;color:${C.oliveDeep}"><span>${esc(t.nameAr)}</span></div>
    <div style="background:${C.terraDeep};color:${C.cream};padding:${story ? "16px 80px 22px" : "8px 64px 14px"};border-radius:90px;box-shadow:0 14px 30px -14px rgba(160,90,44,.8)">${priceBlock(t, story ? 110 : 76, C.cream)}</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:auto">${flagBar}${waLine(t)}</div>
  </div>
</div>`;
}

export function buildHtml(t: TemplateInput): string {
  const body =
    t.angle === "heritage" ? heritage(t) : t.angle === "quote" ? quote(t) : t.angle === "offer" ? offer(t) : showcase(t);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${baseCss(t)}</style></head><body>${body}</body></html>`;
}
