import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildHtml } from "./templates.js";
import { SIZES, layoutTemplate, type RenderRequest, type Renderer } from "./render.js";
import { log } from "../time.js";

export const STORY_SECONDS = 7;
export const STORY_FPS = 30;

/** Animates the existing story template in place (the DOM the still renderer would screenshot): photo zoom/parallax, logo pop,
 * kinetic words for every text block (RTL order), price pop-in, call-to-action fade. `seek(t)` is deterministic. */
const ANIMATION = `
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const eOut3=p=>1-Math.pow(1-p,3), eOut4=p=>1-Math.pow(1-p,4), eIO=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const eBack=p=>{const c=1.70158,d=c+1;return 1+d*Math.pow(p-1,3)+c*Math.pow(p-1,2)};
const $$=s=>[...document.querySelectorAll(s)];
const T=%T%;
// split every text block into words (after the shrink-to-fit pass measured it)
$$('.fit>span').forEach(sp=>{const t=sp.textContent.trim();sp.innerHTML=t.split(/\\s+/).map(w=>'<i class="aw" style="display:inline-block;font-style:normal;opacity:0">'+w.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</i>').join(' ')});
const canvas=document.querySelector('.canvas'), tex=document.querySelector('.tex'), arcs=document.querySelector('.arcs');
const logos=$$('img.logo'), badges=$$('.logo:not(img)'), photos=$$('.photo'), flags=$$('.flag'), rules=$$('.rule'), ctas=$$('.cta');
const heads=$$('.fit.head'), names=$$('.fit.name'), subs=$$('.fit:not(.head):not(.name)');
// the coloured pill around the price (first ancestor with a background), else the price row itself
const pill=el=>{let n=el.parentElement;while(n&&!n.classList.contains('canvas')){const bg=getComputedStyle(n).backgroundColor;if(bg&&bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')return n;n=n.parentElement}return el.parentElement};
const prices=$$('.price').map(pill).filter((x,i,a)=>a.indexOf(x)===i);
const words=el=>[...el.querySelectorAll('.aw')];
function kinetic(el,t,t0,stagger){words(el).forEach((w,i)=>{const p=clamp((t-(t0+i*stagger))/.5),e=eBack(p);w.style.opacity=clamp(p*2.2);w.style.transform='translateY('+((1-e)*70)+'px) rotate('+((1-e)*6)+'deg) scale('+(1+(1-e)*.3)+')'})}
function pop(el,t,t0,dur){const p=clamp((t-t0)/dur);el.style.opacity=clamp(p*2.5);el.style.transform='scale('+(.55+.45*eBack(p))+')'}
function rise(el,t,t0,dur){const p=clamp((t-t0)/dur),e=eOut3(p);el.style.opacity=e;el.style.transform='translateY('+((1-e)*40)+'px)'}
window.seek=function(t){
  if(tex)tex.style.transform='translate('+(-t*10)+'px,'+(t*7)+'px)';
  if(arcs)arcs.style.transform='translate('+(t*8)+'px,'+(t*4)+'px)';
  logos.forEach((l,i)=>{const absolute=getComputedStyle(l).position==='absolute';const p=clamp((t-.1)/.6);l.style.opacity=clamp(p*2);l.style.transform='scale('+(.5+.5*eBack(p))+')'+(absolute?'':'')});
  badges.forEach(b=>pop(b,t,1.0,.55));
  photos.forEach((ph,i)=>{
    const abs=getComputedStyle(ph).position==='absolute', p=clamp((t-.05)/.8), e=eOut4(p);
    ph.style.opacity=clamp(p*3);
    if(!abs)ph.style.transform='scale('+(.88+.12*e)+') translateY('+((1-e)*50)+'px)';
    const k=eIO(clamp(t/T)), img=ph.querySelector('img.ph, img:not(.cutimg)')||ph.querySelector('img');
    if(img&&!img.classList.contains('cutimg'))img.style.transform='translate('+(-18+36*k)+'px,'+(10-20*k)+'px) scale('+(1.06+.12*k)+')';
    const cut=ph.querySelector('.cutimg'); if(cut)cut.style.transform='translateY('+(-10*Math.sin(t*1.6))+'px) scale('+(1+.05*k)+')';
  });
  heads.forEach(h=>kinetic(h,t,.7,.13));
  names.forEach(n=>kinetic(n,t,1.7,.1));
  subs.forEach(s=>kinetic(s,t,2.3,.07));
  prices.forEach(p=>pop(p,t,3.2,.6));
  rules.forEach(r=>{const p=eOut4(clamp((t-1.6)/.6));r.style.opacity=p;r.style.transform='scaleX('+p+')'});
  flags.forEach(f=>{f.style.opacity=eOut3(clamp((t-3.7)/.5))});
  ctas.forEach(c=>rise(c,t,3.8,.7));
};
seek(0);
`;

/** Renders a story as a short vertical video (1080×1920, 7 s) from the current story design, muxed with the music excerpt. */
export async function renderStoryVideo(
  renderer: Renderer,
  req: RenderRequest,
  musicFile: string,
  musicStart: number,
): Promise<{ video: Buffer; cover: Buffer }> {
  const size = SIZES.story;
  const input = await renderer.buildInput({ ...req, type: "story" });
  const page = await renderer.openPage(size);
  try {
    await page.setContent(buildHtml(input), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await layoutTemplate(page);
    await page.evaluate(`(()=>{${ANIMATION.replace("%T%", String(STORY_SECONDS))}})()`);

    const frames = STORY_SECONDS * STORY_FPS;
    const tmp = mkdtempSync(path.join(tmpdir(), "story-"));
    const outFile = path.join(tmp, "story.mp4");
    const ff = spawn(
      "ffmpeg",
      [
        "-v", "error", "-y",
        "-f", "image2pipe", "-framerate", String(STORY_FPS), "-c:v", "mjpeg", "-i", "-",
        "-ss", musicStart.toFixed(3), "-i", musicFile,
        "-t", String(STORY_SECONDS),
        // soft: ≈ -20 LUFS with a fade in / out
        "-af", `loudnorm=I=-20:TP=-2:LRA=7,afade=t=in:st=0:d=0.5,afade=t=out:st=${STORY_SECONDS - 1.2}:d=1.2`,
        "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(STORY_FPS),
        "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
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
    ff.stdin.on("error", () => {});

    let cover: Buffer | null = null;
    const started = Date.now();
    for (let i = 0; i < frames; i++) {
      const t = i / STORY_FPS;
      await page.evaluate((x) => (window as any).seek(x), t);
      const jpg = (await page.screenshot({ type: "jpeg", quality: 90 })) as Buffer;
      if (!cover && t >= 4.6) cover = jpg; // everything has settled by then
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end();
    await done;
    log(`story video rendered: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    const video = readFileSync(outFile);
    rmSync(tmp, { recursive: true, force: true });
    return { video, cover: cover! };
  } finally {
    await page.close();
  }
}
