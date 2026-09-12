"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FloatingBlobs } from "@/components/ui/FloatingBlobs";
import { Sparkles } from "@/components/ui/Sparkles";
import { OliveBranch } from "@/components/ui/OliveBranch";

export function Hero() {
  const t = useTranslations("hero");
  const taglines = t.raw("taglines") as string[];
  const [taglineIndex, setTaglineIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const patternY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % taglines.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [taglines.length]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[100svh] min-h-[640px] w-full items-center justify-center overflow-hidden bg-bg-primary"
    >
      {/* Layered background: soft floating blobs + parallax grain texture + slow-drifting decorative line art */}
      <FloatingBlobs />
      <Sparkles />
      <motion.div
        style={{ y: patternY }}
        aria-hidden
        className="absolute inset-[-10%] bg-grain opacity-[0.03]"
      />
      <OliveBranch
        aria-hidden
        className="animate-drift pointer-events-none absolute bottom-16 start-[-2%] w-56 text-olive opacity-[0.12] sm:w-72"
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg-primary to-transparent" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 flex flex-col items-center px-6 text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          <span className="absolute inset-[-14px] animate-pulse rounded-full bg-terracotta/15 blur-xl" />
          <span className="absolute inset-0 rounded-full ring-1 ring-cream/10" />
          <Image
            src="/images/hattah-logo.jpg"
            alt="HATTAH — حَطّة"
            width={132}
            height={132}
            priority
            className="relative h-24 w-24 rounded-full object-contain shadow-soft sm:h-32 sm:w-32"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-5"
        >
          <Badge>{t("badge")}</Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="font-playfair text-6xl font-extrabold leading-none text-cream sm:text-7xl md:text-8xl"
        >
          {t("brandName")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-3 font-inter text-xs font-semibold tracking-[0.5em] text-cream-secondary/60"
        >
          {t("brandNameLatin")}
        </motion.p>

        <div className="relative mt-8 flex h-14 items-center justify-center px-4 sm:h-10">
          <AnimatePresence mode="wait">
            <motion.p
              key={taglineIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-md font-inter text-lg text-cream-secondary sm:text-xl"
            >
              {taglines[taglineIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-10"
        >
          <Button href="/shop" variant="primary" size="lg">
            {t("cta")}
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-cream-secondary/50"
        >
          <span className="font-inter text-[10px] uppercase tracking-[0.3em]">
            {t("scroll")}
          </span>
          <ChevronDown size={16} />
        </motion.div>
      </motion.div>
    </div>
  );
}
