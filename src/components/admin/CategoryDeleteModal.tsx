"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function CategoryDeleteModal({
  categoryName,
  productCount,
  subcategoryCount,
  onCancel,
  onConfirm,
}: {
  categoryName: string;
  productCount: number;
  subcategoryCount: number;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("admin.categories");
  const [isPending, startTransition] = useTransition();
  const blocked = productCount > 0 || subcategoryCount > 0;

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 px-6 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-cream/10 bg-bg-secondary p-6"
        >
          <div
            className={
              blocked
                ? "mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-olive/15 text-olive"
                : "mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-deep/15 text-terracotta-deep"
            }
          >
            {blocked ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}
          </div>

          {blocked ? (
            <>
              <h2 className="font-playfair text-xl font-bold text-cream">{t("deleteBlockedTitle")}</h2>
              <p className="mt-2 font-inter text-sm text-cream-secondary/75">
                {t("deleteBlockedIntro", { name: categoryName })}
              </p>
              <ul className="mt-2 list-inside list-disc font-inter text-sm text-cream-secondary/75">
                {subcategoryCount > 0 && (
                  <li>{t("linkedSubcategoriesCount", { count: subcategoryCount })}</li>
                )}
                {productCount > 0 && (
                  <li>{t("linkedProductsCount", { count: productCount })}</li>
                )}
              </ul>
              <div className="mt-6 flex justify-end">
                <Button variant="secondary" size="md" onClick={onCancel}>
                  {t("deleteBlockedDismiss")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-playfair text-xl font-bold text-cream">{t("deleteTitle")}</h2>
              <p className="mt-2 font-inter text-sm text-cream-secondary/75">
                {t("deleteBody", { name: categoryName })}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" size="md" onClick={onCancel} disabled={isPending}>
                  {t("deleteCancel")}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="!bg-terracotta-deep hover:!bg-[#8f1b25]"
                >
                  {t("deleteConfirm")}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
