"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";

const SEEN_KEY = "hattah-hero-intro";
const PAUSE_EVENT = "hattah-hero-pause";

/** Before first paint: if the intro already played in this session, show the
 * final state straight away (html.bh-seen disables the entry animations). */
export const HERO_SEEN_SCRIPT = `try{if(sessionStorage.getItem("${SEEN_KEY}"))document.documentElement.classList.add("bh-seen")}catch(e){}`;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Client add-on for the brand hero (#brand-hero):
 *  - gold dust / embers on a light canvas (70 desktop, 30 phone), started after
 *    load, paused off-screen, in a hidden tab, when paused, never with reduced motion;
 *  - parallax: mouse (desktop), gyroscope where it's available without a
 *    permission prompt, otherwise scroll; layers move at different rates (≤14px);
 *  - scroll-out: content scales 1→1.06 and fades as the hero leaves;
 *  - the intro plays once per session;
 *  - a small pause/play button in the corner.
 */
export function HeroFx({ labels }: { labels: { pause: string; play: string } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // Intro once per session (client navigations back home included).
  useIsoLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) document.documentElement.classList.add("bh-seen");
    } catch {}
    const id = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
    }, 3400);
    return () => {
      window.clearTimeout(id);
      // leaving the homepage: the next visit in this session starts settled
      try {
        if (sessionStorage.getItem(SEEN_KEY)) document.documentElement.classList.add("bh-seen");
      } catch {}
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    const hero = document.getElementById("brand-hero");
    if (hero) hero.toggleAttribute("data-paused", paused);
    window.dispatchEvent(new CustomEvent(PAUSE_EVENT, { detail: paused }));
  }, [paused]);

  // Parallax + scroll-out + off-screen pause.
  useEffect(() => {
    const hero = document.getElementById("brand-hero");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => hero.toggleAttribute("data-offscreen", !e.isIntersecting));
    io.observe(hero);
    if (reducedMotion()) return () => io.disconnect();

    let frame = 0;
    let mx = 0;
    let my = 0;
    let sp = 0;
    const apply = () => {
      frame = 0;
      hero.style.setProperty("--mx", mx.toFixed(3));
      hero.style.setProperty("--my", my.toFixed(3));
      hero.style.setProperty("--sp", sp.toFixed(3));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let gyro = false;
    const onScroll = () => {
      const h = hero.offsetHeight || 1;
      const y = window.scrollY;
      if (y > h * 1.2) return;
      sp = Math.min(1, Math.max(0, y / (h * 0.85)));
      if (!fine && !gyro) my = Math.min(1, y / h);
      queue();
    };
    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      queue();
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      gyro = true;
      mx = Math.max(-1, Math.min(1, e.gamma / 30));
      my = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      queue();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    // Gyroscope only where it works without a permission prompt (Android); iOS asks, so it's skipped there.
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined;
    const canGyro = !fine && DOE && typeof DOE.requestPermission !== "function";
    if (canGyro) window.addEventListener("deviceorientation", onOrient, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onOrient);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Particles — started after the page has loaded and gone idle, so they never compete with the LCP.
  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = document.getElementById("brand-hero");
    if (!canvas || !hero || reducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = false;
    let visible = true;
    let started = false;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const count = window.innerWidth < 768 ? 30 : 70;

    // Pre-rendered glow sprites (no per-frame shadowBlur).
    const sprite = (rgb: string) => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, `rgba(${rgb},1)`);
      grd.addColorStop(0.25, `rgba(${rgb},0.55)`);
      grd.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return c;
    };
    const gold = sprite("236,190,110");
    const ember = sprite("232,120,64");

    type P = { x: number; y: number; r: number; vy: number; vx: number; a: number; ph: number; ember: boolean };
    const ps: P[] = [];
    const spawn = (p: Partial<P> = {}): P => ({
      x: Math.random() * w,
      y: h + Math.random() * 40,
      r: 2 + Math.random() * 5.5,
      vy: 0.12 + Math.random() * 0.45,
      vx: (Math.random() - 0.5) * 0.15,
      a: 0.25 + Math.random() * 0.6,
      ph: Math.random() * Math.PI * 2,
      ember: Math.random() < 0.18,
      ...p,
    });
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    let alphaScale = 1;
    const readTheme = () => {
      alphaScale = document.documentElement.getAttribute("data-theme") === "dark" ? 1 : 0.55;
    };

    const frame = () => {
      raf = 0;
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of ps) {
        p.y -= p.vy;
        p.ph += 0.012;
        p.x += p.vx + Math.sin(p.ph) * 0.18;
        if (p.y < -20) Object.assign(p, spawn());
        const fade = Math.min(1, (h - p.y) / 120) * Math.min(1, p.y / 140);
        ctx.globalAlpha = Math.max(0, p.a * fade * alphaScale * (0.75 + 0.25 * Math.sin(p.ph * 3)));
        const s = p.r * 4;
        ctx.drawImage(p.ember ? ember : gold, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    const update = () => {
      const should = started && visible && !pausedRef.current && document.visibilityState === "visible";
      if (should && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const start = () => {
      resize();
      readTheme();
      for (let i = 0; i < count; i++) ps.push(spawn({ y: Math.random() * h }));
      started = true;
      canvas.classList.add("is-on");
      update();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      update();
    });
    io.observe(hero);
    const mo = new MutationObserver(readTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const onPause = () => update();
    window.addEventListener(PAUSE_EVENT, onPause);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("resize", resize);

    let idle = 0;
    const kick = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback;
      idle = ric ? ric(start, { timeout: 2000 }) : window.setTimeout(start, 600);
    };
    if (document.readyState === "complete") kick();
    else window.addEventListener("load", kick, { once: true });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener(PAUSE_EVENT, onPause);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("resize", resize);
      window.removeEventListener("load", kick);
      window.clearTimeout(idle);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="bh-layer bh-particles" aria-hidden />
      <button
        type="button"
        onClick={() => setPaused((v) => !v)}
        aria-pressed={paused}
        aria-label={paused ? labels.play : labels.pause}
        title={paused ? labels.play : labels.pause}
        className="bh-pause"
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
    </>
  );
}

/** Rotating lines under the headline: cross-fade every 5 s with small dots.
 * Stops while the hero is paused or off-screen; reduced motion → no
 * rotation (the first line stays; the dots still let you browse). */
export function HeroPhrases({ phrases, labelFor }: { phrases: string[]; labelFor: string[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onPause = (e: Event) => setPaused((e as CustomEvent<boolean>).detail);
    window.addEventListener(PAUSE_EVENT, onPause);
    return () => window.removeEventListener(PAUSE_EVENT, onPause);
  }, []);

  useEffect(() => {
    if (paused || phrases.length < 2 || reducedMotion()) return;
    const hero = document.getElementById("brand-hero");
    // first change after the intro has finished
    const first = document.documentElement.classList.contains("bh-seen") ? 5000 : 7600;
    let id = window.setTimeout(function tick() {
      if (!hero?.hasAttribute("data-offscreen") && document.visibilityState === "visible") {
        setIndex((i) => (i + 1) % phrases.length);
      }
      id = window.setTimeout(tick, 5000);
    }, first);
    return () => window.clearTimeout(id);
  }, [paused, phrases.length]);

  return (
    <div className="bh-phrases bh-e">
      <div className="bh-phrase-stack">
        {phrases.map((p, i) => (
          <p key={i} aria-hidden={i !== index} className={cn("bh-phrase", i === index && "is-on")}>
            {p}
          </p>
        ))}
      </div>
      <div className="bh-dots">
        {phrases.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={labelFor[i]}
            aria-current={i === index ? "true" : undefined}
            className="bh-dot"
          >
            <span className={cn(i === index && "is-on")} />
          </button>
        ))}
      </div>
    </div>
  );
}
