// Side-by-side montage: original-photo vs cut-out, per template → previews/compare-*.jpg
import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import { ANGLES } from "./types.js";

for (const type of ["feed", "story"] as const) {
  const [w, h] = type === "feed" ? [540, 675] : [450, 800];
  const cells: OverlayOptions[] = [];
  for (const [col, angle] of ANGLES.entries()) {
    for (const [row, mode] of (["orig", "cut"] as const).entries()) {
      cells.push({
        input: await sharp(`previews/${type}-${angle}-${mode}.jpg`).resize(w, h).toBuffer(),
        left: col * (w + 10) + 10,
        top: row * (h + 10) + 10,
      });
    }
  }
  await sharp({ create: { width: 4 * (w + 10) + 10, height: 2 * (h + 10) + 10, channels: 3, background: "#2b2b2b" } })
    .composite(cells)
    .jpeg({ quality: 88 })
    .toFile(`previews/compare-${type}.jpg`);
}
console.log("compare images written");
