import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { getCutoutDataUri } from "./cutout.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPhotoDataUri, fontCss, logoDataUri, siteDisplay, whatsappDisplay } from "./render.js";
import { log } from "../time.js";

export const REEL_W = 1080;
export const REEL_H = 1920;
export const REEL_FPS = 30;
export const REEL_SECONDS = 13;

export interface ReelRequest {
  nameAr: string;
  categoryAr: string;
  price: number;
  oldPrice: number | null;
  /** Main photo, plus an optional second one for scene 2 (falls back to the main photo, panned the other way). */
  photoUrl: string;
  photoUrl2?: string | null;
  removeBg?: boolean;
  /** Hook (headline) and supporting line written by the model. */
  text: { headline: string; subline: string };
  storeUrl?: string;
}

const C = { cream: "#F4EBDA", cream2: "#EFE3D0", olive: "#5C6B45", oliveDeep: "#3B4728", terra: "#C17A45", terraDeep: "#A05A2C" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function lattice(color: string, opacity: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g stroke="${color}" stroke-width="1.6" fill="none" opacity="${opacity}"><path d="M0 0L44 44M44 0L0 44"/></g><g fill="${color}" opacity="${opacity}"><circle cx="22" cy="22" r="3.4"/><circle cx="0" cy="0" r="3.4"/><circle cx="44" cy="0" r="3.4"/><circle cx="0" cy="44" r="3.4"/><circle cx="44" cy="44" r="3.4"/></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

const words = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => `<i class="w">${esc(w)}</i>`)
    .join(" ");

interface Assets {
  photo: string;
  photo2: string;
  cutout: string | null;
}

export function reelHtml(req: ReelRequest, a: Assets): string {
  const site = esc(siteDisplay(req.storeUrl));
  const wa = esc(whatsappDisplay());
  const photo1 = a.cutout ? `<img id="p1" class="cutimg" src="${a.cutout}">` : `<img id="p1" class="ph" src="${a.photo}">`;
  const price = `<div class="pricepill" id="pill" style="top:1485px;opacity:0">${
    req.oldPrice ? `<span class="old">${fmt(req.oldPrice)} TL</span>` : ""
  }<span class="price">${fmt(req.price)} <small>TL</small></span></div>`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
${fontCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${REEL_W}px;height:${REEL_H}px;overflow:hidden;background:${C.cream}}
body{font-family:'Amiri','Playfair Display',serif;color:${C.oliveDeep}}
.stage{position:relative;width:${REEL_W}px;height:${REEL_H}px;overflow:hidden;background:radial-gradient(120% 90% at 50% 0%,${C.cream} 0%,${C.cream2} 100%)}
.tex{position:absolute;inset:0;background-image:${lattice(C.olive, 0.07)};background-repeat:repeat}
.arcs{position:absolute;inset:0;width:100%;height:100%}
.scene{position:absolute;inset:0;opacity:0}
.s3{background:radial-gradient(110% 80% at 50% 0%,#4A5A36 0%,${C.oliveDeep} 70%);color:${C.cream}}
.s3 .tex{background-image:${lattice("#F4EBDA", 0.07)}}
.logo{position:absolute;border-radius:50%;box-shadow:0 10px 28px -8px rgba(59,71,40,.35)}
.frame{position:absolute;overflow:hidden;background:#fff;border:10px solid #FBF5E9;box-shadow:0 30px 60px -22px rgba(59,71,40,.55),0 6px 16px -6px rgba(59,71,40,.3)}
.frame .ph{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 50%}
.frame.cut{background:radial-gradient(75% 65% at 50% 42%,#FCF7EC 0%,#EFE2C8 100%)}
.frame .cutimg{position:absolute;left:8%;top:8%;width:84%;height:84%;object-fit:contain;filter:drop-shadow(0 16px 14px rgba(59,71,40,.32));transform-origin:50% 60%}
.fit{position:absolute;left:100px;right:100px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden}
.head{font-weight:700;line-height:1.38;color:${C.terraDeep}}
.name{font-weight:700;line-height:1.32;color:${C.oliveDeep}}
.subl{font-weight:400;line-height:1.6;color:${C.olive}}
.w{display:inline-block;font-style:normal;opacity:0}
.pricepill{position:absolute;left:50%;display:flex;align-items:baseline;gap:22px;direction:ltr;background:${C.terraDeep};color:${C.cream};padding:8px 58px 14px;border-radius:90px;box-shadow:0 14px 30px -14px rgba(160,90,44,.8);white-space:nowrap;transform:translateX(-50%)}
.price{font-family:'Playfair Display','Amiri',serif;font-weight:700;font-size:78px}
.price small{font-size:40px}
.old{font-family:'Playfair Display','Amiri',serif;text-decoration:line-through;opacity:.65;font-size:42px}
.flag{position:absolute;left:50%;transform:translateX(-50%);display:flex;height:6px;width:76px;border-radius:3px;overflow:hidden}
.flag i{flex:1}
.rule{position:absolute;left:50%;display:flex;align-items:center;gap:14px;width:260px;transform:translateX(-50%)}
.rule::before,.rule::after{content:"";flex:1;height:2px;background:${C.terra};opacity:.75}
.diamond{width:12px;height:12px;background:${C.terra};transform:rotate(45deg)}
.t{position:absolute;left:100px;right:100px;text-align:center;opacity:0}
.url{font-family:'Playfair Display',serif;font-weight:600;direction:ltr;unicode-bidi:isolate;letter-spacing:.02em}
</style></head><body><div class="stage">
<div class="tex"></div>
<svg class="arcs" viewBox="0 0 1080 1920" preserveAspectRatio="none"><path d="M-40 520 A560 560 0 0 1 520 -40" fill="none" stroke="${C.olive}" stroke-width="3" stroke-linecap="round" opacity=".5"/><path d="M1120 1400 A560 560 0 0 1 560 1960" fill="none" stroke="${C.terra}" stroke-width="3" stroke-linecap="round" opacity=".6"/></svg>

<img class="logo" id="logo" src="${logoDataUri()}" style="left:465px;top:250px;width:150px;height:150px;opacity:0">

<div class="scene" id="s1">
  <div class="frame${a.cutout ? " cut" : ""}" id="f1" style="left:160px;top:450px;width:760px;height:900px;border-radius:380px 380px 28px 28px;opacity:0">${photo1}</div>
  <div class="fit head" id="head" data-max="80" data-min="38" style="top:1385px;height:215px"><span>${words(req.text.headline)}</span></div>
  <div class="flag" id="flag1" style="top:1620px;opacity:0"></div>
</div>

<div class="scene" id="s2">
  <div class="frame" id="f2" style="left:140px;top:450px;width:800px;height:720px;border-radius:44px;opacity:0"><img id="p2" class="ph" src="${a.photo2}"></div>
  <div class="fit name" id="name" data-max="62" data-min="30" style="top:1190px;height:150px;opacity:0"><span>${esc(req.nameAr)}</span></div>
  <div class="fit subl" id="subl" data-max="42" data-min="26" style="top:1345px;height:120px;opacity:0"><span>${esc(req.text.subline)}</span></div>
  ${price}
</div>

<div class="scene s3" id="s3">
  <div class="tex"></div>
  <img class="logo" id="logo3" src="${logoDataUri()}" style="left:380px;top:430px;width:320px;height:320px;opacity:0;border:6px solid #FBF5E9">
  <div class="t" id="tag" style="top:790px;font-size:50px;color:#E3C9A0;font-weight:700">تراث فلسطيني بين يديك</div>
  <div class="rule" id="rule" style="top:900px;opacity:0"><span class="diamond"></span></div>
  <div class="t" id="c1" style="top:960px;font-size:52px">اطلب من المتجر</div>
  <div class="t url" id="c2" style="top:1035px;font-size:72px;color:${C.cream}">${site}</div>
  <div class="t" id="c3" style="top:1200px;font-size:52px">أو عبر واتساب</div>
  <div class="t url" id="c4" style="top:1275px;font-size:72px;color:#E3A56E">${wa}</div>
  <div class="flag" id="flag3" style="top:1420px;opacity:0"></div>
</div>
</div>
<script>
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const eo=p=>1-Math.pow(1-p,3);
const eb=p=>{const c=1.70158,d=c+1;return 1+d*Math.pow(p-1,3)+c*Math.pow(p-1,2)};
const $=id=>document.getElementById(id);
$('flag1').innerHTML=$('flag3').innerHTML='<i style="background:#111"></i><i style="background:#2E7D4F"></i><i style="background:#C8323B"></i>';
const S1=[0,4.9],S2=[4.5,9.8],S3=[9.3,${REEL_SECONDS}];
const sceneOp=(t,s,last)=>Math.min(clamp((t-s[0])/.5),last?1:1-clamp((t-(s[1]-.5))/.5));
function enter(el,t,t0,dur,kind){const p=clamp((t-t0)/dur);const e=eo(p);el.style.opacity=e;
  if(kind==='pop'){el.style.transform='translateX(-50%) scale('+(.55+.45*eb(p))+')'}
  else if(kind==='rise'){el.style.transform='translateY('+((1-e)*46)+'px)'}}
window.seek=function(t){
  const o1=sceneOp(t,S1),o2=sceneOp(t,S2),o3=sceneOp(t,S3,true);
  $('s1').style.opacity=o1;$('s2').style.opacity=o2;$('s3').style.opacity=o3;
  $('logo').style.opacity=Math.min(eo(clamp(t/.7)),1-o3);
  let l=t-S1[0];enter($('f1'),t,.15,.8,'rise');
  const z=1+.16*clamp(l/(S1[1]-S1[0]));$('p1').style.transform='scale('+z+') translate('+(-14*l)+'px,'+(-6*l)+'px)';
  document.querySelectorAll('#head .w').forEach((w,i)=>{const p=clamp((t-(1.0+i*.14))/.45);w.style.opacity=eo(p);w.style.transform='translateY('+((1-eo(p))*34)+'px)'});
  $('flag1').style.opacity=eo(clamp((t-2.2)/.5));
  l=t-S2[0];enter($('f2'),t,S2[0]+.1,.7,'rise');
  const z2=1.18-.16*clamp(l/(S2[1]-S2[0]));$('p2').style.transform='scale('+z2+') translate('+(14*l)+'px,'+(8*l)+'px)';
  enter($('name'),t,S2[0]+.55,.6,'rise');enter($('subl'),t,S2[0]+.95,.6,'rise');
  enter($('pill'),t,S2[0]+1.5,.7,'pop');
  const b=S3[0]-.1;enter($('logo3'),t,b,.7,'rise');enter($('tag'),t,b+.45,.6,'rise');
  $('rule').style.opacity=eo(clamp((t-(b+.8))/.5));
  enter($('c1'),t,b+1.0,.5,'rise');enter($('c2'),t,b+1.3,.6,'rise');enter($('c3'),t,b+1.8,.5,'rise');enter($('c4'),t,b+2.1,.6,'rise');
  $('flag3').style.opacity=eo(clamp((t-(b+2.6))/.5));
};
seek(0);
</script></body></html>`;
}

export class ReelRenderer {
  private browser: Browser | null = null;
  constructor(private sb: SupabaseClient | null = null) {}

  async close() {
    await this.browser?.close();
    this.browser = null;
  }

  /** Renders the reel frame by frame (a deterministic seek(t) animation in Chromium) and muxes it with the music in ffmpeg. */
  async render(req: ReelRequest, musicFile: string, musicStart = 0): Promise<{ video: Buffer; cover: Buffer }> {
    this.browser ??= await chromium.launch();
    const photo = await fetchPhotoDataUri(req.photoUrl);
    const assets: Assets = {
      photo,
      photo2: req.photoUrl2 ? await fetchPhotoDataUri(req.photoUrl2) : photo,
      cutout: req.removeBg ? await getCutoutDataUri(this.sb, req.photoUrl) : null,
    };
    const page = await this.browser.newPage({ viewport: { width: REEL_W, height: REEL_H }, deviceScaleFactor: 1 });
    try {
      await page.setContent(reelHtml(req, assets), { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      // Shrink long text until it fits its box (Arabic names vary a lot), now that the fonts are loaded.
      await page.evaluate(() => {
        document.querySelectorAll<HTMLElement>(".fit").forEach((box) => {
          let s = Number(box.dataset.max) || 48;
          const min = Number(box.dataset.min) || 20;
          box.style.fontSize = `${s}px`;
          const inner = box.firstElementChild as HTMLElement;
          while (s > min && (inner.scrollHeight > box.clientHeight + 1 || inner.scrollWidth > box.clientWidth + 1)) {
            s -= 2;
            box.style.fontSize = `${s}px`;
          }
        });
      });

      const frames = REEL_SECONDS * REEL_FPS;
      const tmp = mkdtempSync(path.join(tmpdir(), "reel-"));
      const outFile = path.join(tmp, "reel.mp4");
      const ff = spawn(
        "ffmpeg",
        [
          "-v", "error", "-y",
          "-f", "image2pipe", "-framerate", String(REEL_FPS), "-c:v", "mjpeg", "-i", "-",
          "-ss", String(musicStart), "-i", musicFile,
          "-t", String(REEL_SECONDS),
          "-af", `loudnorm=I=-20:TP=-2:LRA=7,afade=t=in:st=0:d=1,afade=t=out:st=${REEL_SECONDS - 1.8}:d=1.8`,
          "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(REEL_FPS),
          "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2",
          "-movflags", "+faststart", "-shortest", outFile,
        ],
        { stdio: ["pipe", "ignore", "pipe"] },
      );
      let err = "";
      ff.stderr.on("data", (d: Buffer) => (err += d));
      const done = new Promise<void>((res, rej) => {
        ff.on("error", rej);
        ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exit ${code}: ${err.slice(-400)}`))));
      });
      ff.stdin.on("error", () => {}); // the failure is surfaced through `done`

      let cover: Buffer | null = null;
      const started = Date.now();
      for (let i = 0; i < frames; i++) {
        const t = i / REEL_FPS;
        await page.evaluate((x) => (window as any).seek(x), t);
        const jpg = (await page.screenshot({ type: "jpeg", quality: 90 })) as Buffer;
        if (!cover && t >= 2.4) cover = jpg;
        if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
      }
      ff.stdin.end();
      await done;
      log(`reel rendered: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
      const video = readFileSync(outFile);
      rmSync(tmp, { recursive: true, force: true });
      return { video, cover: cover! };
    } finally {
      await page.close();
    }
  }
}
