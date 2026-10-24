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
export const REEL_SECONDS = 15;

export interface ReelRequest {
  nameAr: string;
  categoryAr: string;
  price: number;
  oldPrice: number | null;
  /** Every product photo (the shots cycle through them; a single photo is re-framed differently each shot). */
  photoUrls: string[];
  removeBg?: boolean;
  /** Hook (headline) and supporting line written by the model. */
  text: { headline: string; subline: string };
  storeUrl?: string;
}

export interface ReelTiming {
  seconds: number;
  /** Every shot lasts one `cutStep` (2–4 beats ≈ 1.5–2 s). */
  cutStep: number;
  period: number;
  cuts: number[];
  /** Hook text until `phase1`, name + subline until `phase2`, then name + price, until the end card at `endStart`. */
  phase1: number;
  phase2: number;
  endStart: number;
}

/** Cut grid locked to the music: the excerpt is trimmed so that a beat lands exactly on t=0.
 * The end card starts on the last cut before 11.3 s and the reel ends 4.4 s later (≈ 13.5–16 s). */
export function reelTiming(bpm: number): ReelTiming {
  const period = 60 / bpm;
  const beats = Math.min(4, Math.max(2, Math.round(1.75 / period)));
  const cutStep = beats * period;
  const cuts: number[] = [];
  for (let t = 0; t < 18; t += cutStep) cuts.push(+t.toFixed(4));
  const endStart = cuts.filter((c) => c <= 11.3).slice(-1)[0];
  const seconds = Math.round((endStart + 4.4) * REEL_FPS) / REEL_FPS;
  const phase1 = cuts[2];
  const phase2 = Math.max(cuts.filter((c) => c <= endStart - cutStep * 1.5).slice(-1)[0] ?? cuts[4], phase1 + cutStep);
  return { seconds, cutStep, period, cuts: cuts.filter((c) => c <= endStart), phase1, phase2, endStart };
}

const C = { cream: "#F4EBDA", cream2: "#EFE3D0", olive: "#5C6B45", oliveDeep: "#3B4728", terra: "#C17A45", terraDeep: "#A05A2C" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function lattice(color: string, opacity: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g stroke="${color}" stroke-width="1.6" fill="none" opacity="${opacity}"><path d="M0 0L44 44M44 0L0 44"/></g><g fill="${color}" opacity="${opacity}"><circle cx="22" cy="22" r="3.4"/><circle cx="0" cy="0" r="3.4"/><circle cx="44" cy="0" r="3.4"/><circle cx="0" cy="44" r="3.4"/><circle cx="44" cy="44" r="3.4"/></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/** One <i> per word, in reading order: in an RTL box the first word sits on the right, so the stagger runs right → left. */
const words = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => `<i class="w">${esc(w)}</i>`)
    .join(" ");

export interface ShotImage {
  src: string;
  cut: boolean;
}

/** Shapes the product frame cycles through (inside the 1080×920 media area). */
const SHAPES = [
  { w: 760, h: 900, r: "380px 380px 28px 28px" },
  { w: 880, h: 880, r: "50%" },
  { w: 930, h: 780, r: "56px" },
  { w: 650, h: 900, r: "325px" },
  { w: 800, h: 900, r: "44px 44px 380px 380px" },
];

/** The product name without its variant suffix ("مسبحة كريستالية – ٣٣ حبة" → "مسبحة كريستالية"): short enough to read big. */
export const displayName = (n: string) => {
  const head = n.split(/\s[–—-]\s/)[0].trim();
  return head.length >= 8 ? head : n;
};

export function reelHtml(req: ReelRequest, shots: ShotImage[], timing: ReelTiming): string {
  const site = esc(siteDisplay(req.storeUrl));
  const wa = esc(whatsappDisplay());
  const nShots = timing.cuts.length; // the last shot keeps running under the end-card reveal
  const shotHtml = Array.from({ length: nShots }, (_, i) => {
    const img = shots[i % shots.length];
    const sh = SHAPES[i % SHAPES.length];
    const photo = img.cut
      ? `<img class="cutimg" src="${img.src}">`
      : `<img class="ph" src="${img.src}" style="object-position:${["50% 40%", "40% 50%", "60% 45%"][i % 3]}">`;
    return `<div class="shot" id="sh${i}" style="z-index:${i + 1}">
      <div class="back" id="bk${i}" style="width:${sh.w - 40}px;height:${sh.h - 40}px;border-radius:${sh.r === "50%" ? "50%" : "40px"}"></div>
      <div class="frame${img.cut ? " cut" : ""}" id="fr${i}" style="width:${sh.w}px;height:${sh.h}px;border-radius:${sh.r}">${photo}<div class="sheen" id="sn${i}"></div></div>
    </div>`;
  }).join("\n");
  const cfg = JSON.stringify({ ...timing, nShots, price: req.price });
  const oldHtml = req.oldPrice ? `<span class="old">${req.oldPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} TL</span>` : "";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
${fontCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${REEL_W}px;height:${REEL_H}px;overflow:hidden;background:${C.cream}}
body{font-family:'Amiri','Playfair Display',serif;color:${C.oliveDeep}}
.stage{position:relative;width:${REEL_W}px;height:${REEL_H}px;overflow:hidden;background:radial-gradient(120% 90% at 50% 0%,${C.cream} 0%,${C.cream2} 100%)}
.tex{position:absolute;inset:-80px;background-image:${lattice(C.olive, 0.07)};background-repeat:repeat}
.arcs{position:absolute;inset:0;width:100%;height:100%}
.logo{position:absolute;border-radius:50%;box-shadow:0 10px 28px -8px rgba(59,71,40,.35)}
#media{position:absolute;left:0;top:425px;width:${REEL_W}px;height:920px;perspective:1700px}
.shot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;will-change:transform}
.back{position:absolute;border:3px solid ${C.terra};opacity:.55}
.frame{position:relative;overflow:hidden;background:#fff;border:10px solid #FBF5E9;box-shadow:0 36px 64px -24px rgba(59,71,40,.6),0 8px 18px -8px rgba(59,71,40,.35)}
.frame .ph{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;will-change:transform}
.frame.cut{background:radial-gradient(75% 65% at 50% 42%,#FCF7EC 0%,#EFE2C8 100%)}
.frame .cutimg{position:absolute;left:8%;top:8%;width:84%;height:84%;object-fit:contain;filter:drop-shadow(0 18px 16px rgba(59,71,40,.34));will-change:transform}
.sheen{position:absolute;inset:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.42) 50%,transparent 62%);transform:translateX(-130%);pointer-events:none}
.fit{position:absolute;left:100px;right:100px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden}
.head{font-weight:700;line-height:1.36;color:${C.terraDeep}}
.name{font-weight:700;line-height:1.3;color:${C.oliveDeep}}
.subl{font-weight:400;line-height:1.55;color:${C.olive}}
.w{display:inline-block;font-style:normal;opacity:0;will-change:transform}
.ul{position:absolute;left:50%;height:5px;width:240px;margin-left:-120px;border-radius:3px;background:${C.terra};transform:scaleX(0)}
.pricepill{position:absolute;left:50%;display:flex;align-items:baseline;gap:22px;direction:ltr;background:${C.terraDeep};color:${C.cream};padding:8px 58px 14px;border-radius:90px;box-shadow:0 14px 30px -14px rgba(160,90,44,.8);white-space:nowrap;opacity:0}
.price{font-family:'Playfair Display','Amiri',serif;font-weight:700;font-size:78px;display:inline-block;text-align:center}
.price small{font-size:40px}
.old{font-family:'Playfair Display','Amiri',serif;text-decoration:line-through;opacity:.65;font-size:42px}
.flag{position:absolute;left:50%;margin-left:-38px;display:flex;height:6px;width:76px;border-radius:3px;overflow:hidden}
.flag i{flex:1}
#end{position:absolute;inset:0;background:radial-gradient(110% 80% at 50% 0%,#4A5A36 0%,${C.oliveDeep} 70%);color:${C.cream};clip-path:circle(0px at 50% 52%)}
#end .tex{background-image:${lattice("#F4EBDA", 0.07)}}
.t{position:absolute;left:100px;right:100px;text-align:center}
.url{font-family:'Playfair Display',serif;font-weight:600;direction:ltr;unicode-bidi:isolate;letter-spacing:.02em}
.rule{position:absolute;left:50%;margin-left:-130px;display:flex;align-items:center;gap:14px;width:260px}
.rule::before,.rule::after{content:"";flex:1;height:2px;background:${C.terra};opacity:.8}
.diamond{width:12px;height:12px;background:${C.terra};transform:rotate(45deg)}
</style></head><body><div class="stage">
<div class="tex" id="tex"></div>
<svg class="arcs" viewBox="0 0 1080 1920" preserveAspectRatio="none"><path id="arc1" d="M-40 520 A560 560 0 0 1 520 -40" fill="none" stroke="${C.olive}" stroke-width="3" stroke-linecap="round" opacity=".5"/><path id="arc2" d="M1120 1400 A560 560 0 0 1 560 1960" fill="none" stroke="${C.terra}" stroke-width="3" stroke-linecap="round" opacity=".6"/></svg>
<img class="logo" id="logo" src="${logoDataUri()}" style="left:465px;top:245px;width:150px;height:150px;opacity:0">

<div id="media">${shotHtml}</div>

<div class="fit head" id="head" data-max="84" data-min="40" style="top:1385px;height:215px"><span>${words(req.text.headline)}</span></div>
<div class="ul" id="ul" style="top:1606px"></div>

<div class="fit name" id="name" data-max="66" data-min="34" style="top:1350px;height:152px"><span>${words(displayName(req.nameAr))}</span></div>
<div class="fit subl" id="subl" data-max="44" data-min="28" style="top:1502px;height:116px"><span>${words(req.text.subline)}</span></div>
<div class="pricepill" id="pill" style="top:1508px">${oldHtml}<span class="price" id="price">0 <small>TL</small></span></div>

<div id="end"><div class="tex"></div>
  <img class="logo" id="logo3" src="${logoDataUri()}" style="left:370px;top:420px;width:340px;height:340px;border:6px solid #FBF5E9;opacity:0">
  <div class="t" id="tag" style="top:800px;font-size:56px;color:#E3C9A0;font-weight:700"><span>${words("تراث فلسطيني بين يديك")}</span></div>
  <div class="rule" id="rule" style="top:925px"><span class="diamond"></span></div>
  <div class="t" id="c1" style="top:975px;font-size:54px"><span>${words("اطلب من المتجر")}</span></div>
  <div class="t url" id="c2" style="top:1050px;font-size:72px;color:${C.cream}"><span id="c2s" style="display:inline-block;clip-path:inset(0 100% 0 0)">${site}</span></div>
  <div class="t" id="c3" style="top:1220px;font-size:54px"><span>${words("أو عبر واتساب")}</span></div>
  <div class="t url" id="c4" style="top:1295px;font-size:72px;color:#E3A56E"><span id="c4s" style="display:inline-block;clip-path:inset(0 100% 0 0)">${wa}</span></div>
  <div class="flag" id="flag3" style="top:1450px"><i style="background:#111"></i><i style="background:#2E7D4F"></i><i style="background:#C8323B"></i></div>
</div>
</div>
<script>
const CFG=${cfg};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const eOut3=p=>1-Math.pow(1-p,3), eOut4=p=>1-Math.pow(1-p,4), eIn3=p=>p*p*p;
const eIO=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const eBack=p=>{const c=1.70158,d=c+1;return 1+d*Math.pow(p-1,3)+c*Math.pow(p-1,2)};
const $=id=>document.getElementById(id);
const D=.5, T=CFG.cuts, last=CFG.nShots-1;
const TYPES=['slide','zoom','iris','up','wipe'];
const beat=t=>{const ph=((t%CFG.period)+CFG.period)%CFG.period/CFG.period;return Math.exp(-ph*5)};
const price=$('price'), fmt=n=>Math.round(n).toLocaleString('en-US');
// fixed width for the count-up so the pill does not jiggle (measured once the fonts are in)
window.initPrice=()=>{price.style.minWidth='0';price.firstChild.nodeValue=fmt(CFG.price)+' ';price.style.minWidth=price.getBoundingClientRect().width+'px'};
const wordsOf=id=>[...document.querySelectorAll('#'+id+' .w')];
// Kinetic words: each word flies in (rise + tilt + overshoot) with a stagger, and optionally leaves upwards.
function kinetic(id,t,t0,t1,stagger,dur){wordsOf(id).forEach((w,i)=>{
  const p=clamp((t-(t0+i*stagger))/dur), q=t1==null?0:clamp((t-(t1+i*.05))/.3), e=eBack(p);
  w.style.opacity=clamp(p*2.2)*(1-q);
  w.style.transform='translateY('+((1-e)*80-q*60)+'px) rotate('+((1-e)*7)+'deg) scale('+(1+(1-e)*.35)+')'})}
function shotState(i,t){
  const el=$('sh'+i), fr=$('fr'+i), bk=$('bk'+i), sn=$('sn'+i);
  const c0=T[i], c1=i<last?T[i+1]:1e9;
  if(t<c0||t>c1+D){el.style.opacity=0;return}
  const type=i===0?'pop':TYPES[(i-1)%TYPES.length], dir=i%2?1:-1;
  const p=clamp((t-c0)/D), e=eOut4(p);
  let tf='',clip='none',op=1;
  if(i===0){tf='scale('+(.8+.2*eOut3(clamp(t/.45)))+')';op=clamp(t/.1)}
  else if(type==='slide'){tf='translateX('+(dir*(1-e)*1250)+'px) rotateY('+(dir*(1-e)*-38)+'deg)'}
  else if(type==='zoom'){tf='scale('+(.45+.55*e)+')';op=clamp(e*2.2)}
  else if(type==='iris'){clip='circle('+(e*1000)+'px at 50% 50%)'}
  else if(type==='up'){tf='translateY('+((1-e)*520)+'px) rotateX('+((1-e)*25)+'deg)';op=clamp(e*2.5)}
  else if(type==='wipe'){clip='inset(0 0 0 '+((1-e)*100)+'%)'}
  if(t>c1){ // outgoing: shaped by the NEXT shot's transition
    const ne=eIn3(clamp((t-c1)/D)),nt=TYPES[i%TYPES.length],nd=(i+1)%2?1:-1;
    if(nt==='slide'){tf='translateX('+(-nd*ne*420)+'px) scale('+(1-.1*ne)+')';op=1-ne*.5}
    else if(nt==='zoom'){tf='scale('+(1+ne*.9)+')';op=1-ne}
    else{tf='scale('+(1-.06*ne)+')';op=1-ne*.35}
    clip='none'}
  el.style.opacity=op;el.style.transform=tf;el.style.clipPath=clip;
  // gentle 3D tilt + beat pulse on the frame; parallax on the photo and on the outline behind it
  const ph=t-c0, ry=8*Math.sin(ph*2.1+i*1.7), rx=4*Math.cos(ph*1.6+i), pulse=1+.022*beat(t);
  fr.style.transform='rotateY('+ry+'deg) rotateX('+rx+'deg) scale('+pulse+')';
  bk.style.transform='translate('+(-ry*7)+'px,'+(rx*7)+'px) rotate('+(ph*3+i*9)+'deg) scale('+(1.04+.02*Math.sin(ph*2))+')';
  const k=eIO(clamp(ph/(CFG.cutStep+D))), sx=[1,-1,1,-1][i%4], sy=[1,1,-1,-1][i%4];
  fr.firstElementChild.style.transform='translate('+(sx*(-30+60*k)-ry*4)+'px,'+(sy*(-20+40*k)+rx*4)+'px) scale('+(1.06+.2*k)+')';
  sn.style.transform='translateX('+(-130+260*clamp(ph/1.0))+'%)';
}
window.seek=function(t){
  const be=beat(t), E=CFG.endStart, endP=clamp((t-E)/.5);
  $('tex').style.transform='translate('+(-t*14)+'px,'+(t*9)+'px)';
  $('arc1').style.transform='translate('+(t*6)+'px,'+(t*3)+'px)';$('arc2').style.transform='translate('+(-t*8)+'px,'+(-t*4)+'px)';
  const lp=clamp(t/.6);
  $('logo').style.opacity=clamp(lp*2)*(1-endP);$('logo').style.transform='translateY('+((1-eBack(lp))*-120)+'px) scale('+(1+.04*be)+')';
  for(let i=0;i<CFG.nShots;i++)shotState(i,t);
  const B0=CFG.phase1, C0=CFG.phase2;
  // phase 1 — the hook: the first word lands within the first 0.2 s
  kinetic('head',t,.05,B0-.35,.11,.5);
  $('ul').style.transform='scaleX('+eOut4(clamp((t-.6)/.5))*(1-clamp((t-(B0-.3))/.25))+')';
  // phase 2 — product name, then the supporting line
  kinetic('name',t,B0+.05,null,.1,.5);kinetic('subl',t,B0+.4,C0-.3,.07,.45);
  // phase 3 — the price pops in and counts up
  const pp=clamp((t-C0)/.55);
  const pill=$('pill');pill.style.opacity=clamp(pp*2.5)*(1-endP);pill.style.transform='translateX(-50%) scale('+(.5+.5*eBack(pp)+.03*be)+')';
  price.firstChild.nodeValue=fmt(CFG.price*eOut3(clamp((t-C0)/.7)))+' ';
  // end card: iris reveal from the centre, then kinetic text
  $('end').style.clipPath='circle('+(eOut4(clamp((t-E)/.55))*1500)+'px at 50% 52%)';
  const b=E+.25, l3=clamp((t-b)/.7);
  $('logo3').style.opacity=clamp(l3*2.5);$('logo3').style.transform='translateY('+((1-eBack(l3))*-420)+'px) scale('+(1+.03*be)+')';
  kinetic('tag',t,b+.5,null,.12,.5);
  $('rule').style.transform='scaleX('+eOut4(clamp((t-(b+1.0))/.5))+')';
  kinetic('c1',t,b+1.1,null,.1,.45);
  $('c2s').style.clipPath='inset(0 '+((1-eOut4(clamp((t-(b+1.5))/.7)))*100)+'% 0 0)';
  kinetic('c3',t,b+2.0,null,.1,.45);
  $('c4s').style.clipPath='inset(0 '+((1-eOut4(clamp((t-(b+2.4))/.7)))*100)+'% 0 0)';
  $('flag3').style.transform='scaleX('+eOut4(clamp((t-(b+2.9))/.5))+')';
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

  /** Renders the reel frame by frame (a deterministic seek(t) animation in Chromium) and muxes it with the music in ffmpeg.
   * `musicStart` must put a beat exactly at t=0 (see musicStartFor) so every cut lands on the beat. */
  async render(req: ReelRequest, musicFile: string, musicStart: number, bpm: number): Promise<{ video: Buffer; cover: Buffer; timing: ReelTiming }> {
    this.browser ??= await chromium.launch();
    const timing = reelTiming(bpm);
    const urls = req.photoUrls.slice(0, 6);
    const photos = await Promise.all(urls.map((u) => fetchPhotoDataUri(u)));
    const shots: ShotImage[] = photos.map((src) => ({ src, cut: false }));
    if (req.removeBg) {
      const cut = await getCutoutDataUri(this.sb, urls[0]);
      if (cut) shots.unshift({ src: cut, cut: true });
    }
    const page = await this.browser.newPage({ viewport: { width: REEL_W, height: REEL_H }, deviceScaleFactor: 1 });
    try {
      await page.setContent(reelHtml(req, shots, timing), { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      // Shrink long text until it fits its box (Arabic names vary a lot), now that the fonts are loaded.
      await page.evaluate(() => {
        // measure with the words at rest: their fly-in offsets would count as overflow and shrink the text
        document.querySelectorAll<HTMLElement>(".w").forEach((w) => (w.style.transform = "none"));
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
        (window as any).initPrice();
        (window as any).seek(0);
      });

      const frames = Math.round(timing.seconds * REEL_FPS);
      const tmp = mkdtempSync(path.join(tmpdir(), "reel-"));
      const outFile = path.join(tmp, "reel.mp4");
      const ff = spawn(
        "ffmpeg",
        [
          "-v", "error", "-y",
          "-f", "image2pipe", "-framerate", String(REEL_FPS), "-c:v", "mjpeg", "-i", "-",
          "-ss", musicStart.toFixed(3), "-i", musicFile,
          "-t", String(timing.seconds),
          // ≈ -18 LUFS, soft fade in / out
          "-af", `loudnorm=I=-18:TP=-2:LRA=7,afade=t=in:st=0:d=0.8,afade=t=out:st=${timing.seconds - 1.6}:d=1.6`,
          "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(REEL_FPS),
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
        const jpg = (await page.screenshot({ type: "jpeg", quality: 92 })) as Buffer;
        if (!cover && t >= Math.min(1.4, timing.phase1 - 0.3)) cover = jpg;
        if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
      }
      ff.stdin.end();
      await done;
      log(`reel rendered: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s (${(60 / timing.period).toFixed(0)} bpm, cut every ${timing.cutStep.toFixed(2)}s)`);
      const video = readFileSync(outFile);
      rmSync(tmp, { recursive: true, force: true });
      return { video, cover: cover!, timing };
    } finally {
      await page.close();
    }
  }
}
