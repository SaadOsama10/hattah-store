"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function DeleteConfirmModal({
  productName,
  onCancel,
  onConfirm,
}: {
  productName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("admin.deleteModal");
  const [isPending, startTransition] = useTransition();

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm px-6"
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
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-deep/15 text-terracotta-deep">
            <AlertTriangle size={22} />
          </div>
          <h2 className="font-playfair text-xl font-bold text-cream">{t("title")}</h2>
          <p className="mt-2 font-inter text-sm text-cream-secondary/75">
            {t("body", { productName })}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" size="md" onClick={onCancel} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={isPending}
              className="!bg-terracotta-deep hover:!bg-[#8f1b25]"
            >
              {t("confirm")}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
