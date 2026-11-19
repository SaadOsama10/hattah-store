"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { BrandStatus } from "@/components/ui/BrandStatus";

/** Catches any server-side rendering failure on a storefront page (e.g. a
 * transient Supabase timeout) so visitors see a friendly retry screen
 * instead of the framework's blank crash page. `reset()` re-renders the
 * segment without a full page reload — usually enough to recover from a
 * one-off backend hiccup. */
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrandStatus title={t("errorTitle")} body={t("errorBody")}>
      <Button onClick={() => reset()} variant="primary" size="lg">
        {t("retry")}
      </Button>
    </BrandStatus>
  );
}
