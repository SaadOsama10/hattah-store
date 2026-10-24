"use client";

import { LazyMotion } from "framer-motion";

// framer-motion's animation features load after first paint, so the ~40 KB engine is off the critical path.
// Site components use the lightweight `m` component; `domMax` covers the gallery's drag gesture.
const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
