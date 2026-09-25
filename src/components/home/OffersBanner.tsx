"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Tag } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function OffersBanner() {
  const t = useTranslations("offers");

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link
          href="/offers"
          className="group flex flex-col items-start gap-4 rounded-2xl border border-terracotta/25 bg-terracotta/[0.06] px-6 py-5 transition-colors duration-300 hover:border-terracotta/40 hover:bg-terracotta/10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta/15 text-terracotta">
              <Tag size={20} />
            </span>
            <div>
              <p className="font-playfair text-lg font-bold text-cream">{t("bannerTitle")}</p>
              <p className="font-inter text-sm text-cream-secondary/70">{t("bannerSubtitle")}</p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 font-inter text-xs uppercase tracking-widest text-terracotta">
            {t("bannerCta")}
            <ArrowRight
              size={14}
              className="rtl:-scale-x-100 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
            />
          </span>
        </Link>
      </motion.div>
    </section>
  );
}
