"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { OliveBranch } from "@/components/ui/OliveBranch";
import { Badge } from "@/components/ui/Badge";
import { FloatingBlobs } from "@/components/ui/FloatingBlobs";

export function OurStory() {
  const t = useTranslations("story");

  return (
    <section id="our-story" className="relative overflow-hidden bg-bg-secondary py-28">
      <FloatingBlobs
        blobs={[
          { className: "-start-20 top-0", color: "var(--color-olive)", size: 320, animate: "animate-float-slow" },
          { className: "-end-16 bottom-0", color: "var(--color-terracotta)", size: 280, animate: "animate-float" },
        ]}
      />
      <GrainOverlay opacity="opacity-[0.03]" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-3xl px-6 text-center"
      >
        <Badge>{t("eyebrow")}</Badge>
        <h2 className="mt-5 font-playfair text-3xl font-extrabold leading-tight text-cream sm:text-5xl">
          {t("title")}
        </h2>
        <TatreezDivider className="my-8" />
        <p className="font-inter text-base leading-loose text-cream-secondary/85 sm:text-lg">
          {t("body")}
        </p>
        <OliveBranch
          aria-hidden
          className="pointer-events-none mx-auto mt-10 h-8 w-40 text-olive opacity-40"
        />
      </motion.div>
    </section>
  );
}
