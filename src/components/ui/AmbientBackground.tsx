"use client";

import { motion, useScroll, useTransform } from "framer-motion";

/**
 * A fixed, layered glow sitting behind all page content. Its opacity
 * breathes subtly as the visitor scrolls, giving the background a sense
 * of depth rather than a flat single color. Theme-aware via the
 * --t-glow-* CSS variables (see globals.css).
 */
export function AmbientBackground() {
  const { scrollYProgress } = useScroll();
  const intensity = useTransform(scrollYProgress, [0, 0.5, 1], [0.75, 1, 0.85]);

  return (
    <motion.div
      aria-hidden
      style={{ opacity: intensity }}
      className="pointer-events-none fixed inset-0 -z-10"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 900px 600px at 12% -8%, var(--t-glow-a), transparent 60%),
            radial-gradient(ellipse 800px 700px at 92% 18%, var(--t-glow-b), transparent 55%),
            radial-gradient(ellipse 1000px 800px at 50% 115%, var(--t-glow-c), transparent 60%)
          `,
        }}
      />
    </motion.div>
  );
}
