import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PolicyPage } from "@/components/legal/PolicyPage";
import { buildMetadata } from "@/lib/seo";
import { BUSINESS } from "@/lib/site";
import type { Locale } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "policies" });
  return buildMetadata({
    locale,
    path: "/shipping",
    title: t("seoShippingTitle"),
    description: t("seoShippingDescription", { area: BUSINESS.freeDeliveryArea[locale as Locale] }),
  });
}

export default async function ShippingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PolicyPage locale={locale as Locale} kind="shipping" />;
}
