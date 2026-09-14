"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";

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
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 pt-24 text-center">
      <h1 className="font-playfair text-4xl font-bold text-cream">{t("errorTitle")}</h1>
      <Divider className="my-6" />
      <p className="max-w-md font-inter text-cream-secondary/70">{t("errorBody")}</p>
      <div className="mt-10">
        <Button onClick={() => reset()} variant="primary">
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
