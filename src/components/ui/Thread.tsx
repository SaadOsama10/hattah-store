"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

type Stitch = { x: number; y: number; len: number; green: boolean; dir: number };
type Geo = { w: number; h: number; d: string; total: number; knot: { x: number; y: number } | null; stitches: Stitch[] };

/**
 * "The thread" — one red embroidery thread through the whole page.
 * It leaves the hero logo sideways ([data-thread-start]), runs down the page
 * edge (right in RTL, left in LTR) in a gentle wave, makes a small
 * cross-stitch at the start of every section ([data-stitch]; green on
 * [data-stitch="green"]) and ends in a knot under the footer's HATTAH
 * ([data-thread-knot]). It is sewn as you scroll: stroke-dashoffset follows
 * the scroll position. Layout is only measured on resize; scrolling just
 * writes one style. Reduced motion: shown complete and still.
 * Pages without [data-thread-start] get no thread.
 */
export function Thread() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const table = useRef<{ len: number[]; y: number[]; total: number } | null>(null);
  const shown = useRef<boolean[]>([]);

  // Build the path from the anchors on the page.
  useEffect(() => {
    const root = rootRef.current?.parentElement;
    if (!root) return;
    let timer = 0;
    const build = () => {
      const start = root.querySelector<HTMLElement>("[data-thread-start]");
      if (!start) {
        setGeo(null);
        return;
      }
      const rr = root.getBoundingClientRect();
      const rel = (r: DOMRect) => ({ l: r.left - rr.left, r: r.right - rr.left, t: r.top - rr.top, b: r.bottom - rr.top });
      const w = root.clientWidth;
      // the layer is absolutely positioned, so clientHeight is the content (main + footer) only
      const h = root.clientHeight;
      const mobile = w < 768;
      const rtl = document.documentElement.dir === "rtl";
      const inward = rtl ? -1 : 1;
      const xe = rtl ? w - (mobile ? 7 : 22) : mobile ? 7 : 22;
      const amp = mobile ? 3.5 : 8;
      const wave = mobile ? 120 : 190;

      // Path + a y → length table, measured with plain arithmetic while the path
      // is built (no getTotalLength / getPointAtLength: those were costly).
      let cur = { x: 0, y: 0 };
      let total = 0;
      let maxY = -Infinity;
      const tableLen: number[] = [0];
      const tableY: number[] = [];
      const seg = (pts: { x: number; y: number }[]) => {
        // length of a quadratic (3 pts) or cubic (4 pts) bezier from `cur`, 8 samples
        const P = [cur, ...pts];
        let px = cur.x;
        let py = cur.y;
        for (let i = 1; i <= 8; i++) {
          const t = i / 8;
          const mt = 1 - t;
          let x: number;
          let yy: number;
          if (P.length === 3) {
            x = mt * mt * P[0].x + 2 * mt * t * P[1].x + t * t * P[2].x;
            yy = mt * mt * P[0].y + 2 * mt * t * P[1].y + t * t * P[2].y;
          } else {
            x = mt ** 3 * P[0].x + 3 * mt * mt * t * P[1].x + 3 * mt * t * t * P[2].x + t ** 3 * P[3].x;
            yy = mt ** 3 * P[0].y + 3 * mt * mt * t * P[1].y + 3 * mt * t * t * P[2].y + t ** 3 * P[3].y;
          }
          total += Math.hypot(x - px, yy - py);
          maxY = Math.max(maxY, yy);
          tableLen.push(total);
          tableY.push(maxY);
          px = x;
          py = yy;
        }
        cur = P[P.length - 1];
      };
      const f = (n: number) => n.toFixed(1);

      const ls = rel(start.getBoundingClientRect());
      const sx = rtl ? ls.r + 6 : ls.l - 6;
      const sy = (ls.t + ls.b) / 2;
      let y = sy + (mobile ? 120 : 170);
      cur = { x: sx, y: sy };
      tableY.push(sy);
      const c1 = { x: sx + (rtl ? 140 : -140), y: sy };
      const c2 = { x: xe, y: sy + 30 };
      let d = `M${f(sx)} ${f(sy)} C${f(c1.x)} ${f(c1.y)} ${xe} ${f(c2.y)} ${xe} ${f(y)}`;
      seg([c1, c2, { x: xe, y }]);

      const anchors = [...root.querySelectorAll<HTMLElement>("[data-stitch]")]
        .map((el) => ({ y: rel(el.getBoundingClientRect()).t + (mobile ? 40 : 64), green: el.dataset.stitch === "green" }))
        .filter((a) => a.y > y)
        .sort((a, b) => a.y - b.y);
      const knotEl = root.querySelector<HTMLElement>("[data-thread-knot]");
      const kr = knotEl ? rel(knotEl.getBoundingClientRect()) : null;
      const knot = kr ? { x: (kr.l + kr.r) / 2, y: kr.b - (mobile ? 8 : 18) } : null;
      const edgeEnd = knot ? knot.y - (mobile ? 90 : 160) : h - 20;

      // gentle wave down the edge
      let flip = 1;
      const waveTo = (target: number) => {
        while (y + wave / 2 <= target) {
          const q = { x: xe + flip * amp * 2, y: y + wave / 4 };
          d += ` Q${f(q.x)} ${f(q.y)} ${xe} ${f(y + wave / 2)}`;
          seg([q, { x: xe, y: y + wave / 2 }]);
          y += wave / 2;
          flip = -flip;
        }
        if (target > y) {
          // finish with a proportionally smaller wave so there is no kink
          const rem = target - y;
          const q = { x: xe + flip * amp * 2 * (rem / (wave / 2)), y: y + rem / 2 };
          d += ` Q${f(q.x)} ${f(q.y)} ${xe} ${f(target)}`;
          seg([q, { x: xe, y: target }]);
          y = target;
          flip = -flip;
        }
      };
      const stitchYs: { y: number; green: boolean }[] = [];
      for (const a of anchors) {
        if (a.y >= edgeEnd) break;
        waveTo(a.y);
        stitchYs.push(a);
      }
      waveTo(edgeEnd);
      if (knot) {
        const k1 = { x: xe, y: edgeEnd + 70 };
        const k2 = { x: knot.x, y: knot.y - 70 };
        d += ` C${xe} ${f(k1.y)} ${f(k2.x)} ${f(k2.y)} ${f(knot.x)} ${f(knot.y)}`;
        seg([k1, k2, knot]);
      }

      table.current = { len: tableLen, y: tableY, total };
      const lenAt = (yy: number) => {
        const i = tableY.findIndex((v) => v >= yy);
        return i < 0 ? total : tableLen[i];
      };
      const stitches: Stitch[] = stitchYs.map((st) => ({ x: xe, y: st.y, len: lenAt(st.y), green: st.green, dir: inward }));
      shown.current = stitches.map(() => false);
      setGeo({ w, h, d, knot, stitches, total });
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 250);
    };
    // first build once the page is idle — never on the critical path
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const idle = ric ? ric(build, { timeout: 1500 }) : window.setTimeout(build, 300);
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    window.addEventListener("load", schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener("load", schedule);
      window.clearTimeout(timer);
      (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle);
      window.clearTimeout(idle);
    };
  }, [pathname]);

  // Sew with the scroll.
  useEffect(() => {
    const root = rootRef.current?.parentElement;
    const p = pathRef.current;
    const svg = p?.ownerSVGElement;
    if (!geo || !root || !p || !svg || !table.current) return;
    const { len, y, total } = table.current;
    p.style.strokeDasharray = `${total}`;
    const stitchEls = [...svg.querySelectorAll<SVGGElement>("[data-x]")];
    const knotEl = svg.querySelector<SVGPathElement>("[data-knot]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      p.style.strokeDashoffset = "0";
      stitchEls.forEach((s) => s.classList.add("is-on"));
      knotEl?.classList.add("is-on");
      return;
    }
    let frame = 0;
    let rootTop = root.getBoundingClientRect().top + window.scrollY;
    const update = () => {
      frame = 0;
      // the needle sits at 72% of the screen and slides to the very end as the page bottoms out
      const vh = window.innerHeight;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
      const needle = window.scrollY - rootTop + vh * (0.72 + 0.3 * Math.min(1, window.scrollY / maxScroll));
      const i = y.findIndex((v) => v >= needle);
      const drawn = i < 0 ? total : len[i];
      p.style.strokeDashoffset = `${(total - drawn).toFixed(1)}`;
      knotEl?.classList.toggle("is-on", drawn >= total - 2);
      geo.stitches.forEach((s, k) => {
        const on = drawn >= s.len;
        if (on !== shown.current[k]) {
          shown.current[k] = on;
          stitchEls[k]?.classList.toggle("is-on", on);
        }
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      rootTop = root.getBoundingClientRect().top + window.scrollY;
      onScroll();
    };
    // first stitches follow the hero's word-by-word entry
    p.style.strokeDashoffset = `${total}`;
    const first = window.setTimeout(() => {
      p.classList.add("is-live");
      update();
    }, 1250);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [geo]);

  return (
    <div ref={rootRef} aria-hidden className="thread-layer" style={geo ? undefined : { display: "none" }}>
      <svg width={geo?.w ?? 0} height={geo?.h ?? 0} viewBox={`0 0 ${geo?.w ?? 0} ${geo?.h ?? 0}`}>
        <path ref={pathRef} className="thread-path" d={geo?.d ?? ""} pathLength={geo?.total || undefined} />
        {geo?.stitches.map((s, i) => (
          <g key={i} data-x="" className={s.green ? "thread-stitch is-green" : "thread-stitch"}>
            {[0, 1, 2].map((k) => {
              const cx = s.x + s.dir * (12 + k * 11);
              const r = 3.6;
              return (
                <path
                  key={k}
                  style={{ transitionDelay: `${k * 90}ms` }}
                  d={`M${cx - r} ${s.y - r} L${cx + r} ${s.y + r} M${cx + r} ${s.y - r} L${cx - r} ${s.y + r}`}
                />
              );
            })}
          </g>
        ))}
        {geo?.knot && (
          <path
            className="thread-knot-loop"
            data-knot=""
            d={`M${geo.knot.x} ${geo.knot.y} c 6 -2 8 6 2 8 c -6 2 -9 -6 -3 -9 c 4 -2 7 1 6 4`}
          />
        )}
      </svg>
    </div>
  );
}
