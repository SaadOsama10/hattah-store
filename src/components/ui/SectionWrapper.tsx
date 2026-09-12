"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionWrapper({
  children,
  className,
  delay = 0,
  as = "section",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "section" | "div";
}) {
  const Component = motion[as];

  return (
    <Component
      initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}
