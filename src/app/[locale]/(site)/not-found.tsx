import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Link } from "@/i18n/navigation";

export default async function SiteNotFound() {
  const t = await getTranslations("notFoundPage");
  const tSeo = await getTranslations("seo");
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 pt-24 text-center">
      <p className="font-inter text-sm uppercase tracking-[0.3em] text-terracotta">404</p>
      <h1 className="mt-3 font-playfair text-4xl font-bold text-cream">{t("title")}</h1>
      <Divider className="my-6" />
      <p className="max-w-md font-inter text-cream-secondary/70">{t("body")}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button href="/shop" variant="primary">{t("shop")}</Button>
        <Link href="/" className="font-inter text-sm text-terracotta hover:underline">{tSeo("home")}</Link>
        <Link href="/faq" className="font-inter text-sm text-terracotta hover:underline">{tSeo("faq")}</Link>
      </div>
    </div>
  );
}
