"use client";

import { useLayoutEffect } from "react";

/**
 * Picks one random photo per category tile, once per visit, before the
 * tiles are painted; it stays for the whole visit (no rotation). Avoids
 * repeating the photo shown last visit (remembered per category in
 * localStorage, if available). Self-contained plain JS so it can also run
 * as the tiny inline script right after the grid (first load, before
 * hydration); the layout effect covers in-app navigation back to the
 * homepage, where React doesn't execute inline scripts.
 */
function pickTiles() {
  const imgs = document.querySelectorAll("img[data-tile]");
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i] as HTMLImageElement;
    if (img.getAttribute("data-picked")) continue;
    img.setAttribute("data-picked", "1");
    let c: [string, string][];
    try {
      c = JSON.parse(img.getAttribute("data-tile-candidates") || "[]");
    } catch {
      continue;
    }
    if (c.length < 2) continue;
    const key = "hattah-tile-" + img.getAttribute("data-tile");
    let last = -1;
    try {
      last = parseInt(localStorage.getItem(key) || "-1", 10);
    } catch {}
    let pick = Math.floor(Math.random() * c.length);
    if (pick === last) pick = (pick + 1 + Math.floor(Math.random() * (c.length - 1))) % c.length;
    try {
      localStorage.setItem(key, String(pick));
    } catch {}
    if (pick !== 0) {
      img.srcset = c[pick][1];
      img.src = c[pick][0];
    }
  }
}

export const TILE_PICK_SCRIPT = `(${pickTiles.toString()})()`;

export function TilePicker() {
  useLayoutEffect(() => {
    pickTiles();
  }, []);
  return <script dangerouslySetInnerHTML={{ __html: TILE_PICK_SCRIPT }} />;
}
