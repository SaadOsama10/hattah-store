"use client";

import { useState, type ReactNode } from "react";

// False until the first page of the visit has rendered: the first paint is
// never animated (that would delay the LCP); later client navigations fade in.
let navigated = false;

export function PageFade({ children }: { children: ReactNode }) {
  const [animate] = useState(() => navigated);
  if (typeof window !== "undefined") navigated = true;
  return <div className={animate ? "page-in" : undefined}>{children}</div>;
}
