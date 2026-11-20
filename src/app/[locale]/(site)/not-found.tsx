import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/SectionHeading";
import { BrandStatus } from "@/components/ui/BrandStatus";

export default async function SiteNotFound() {
  const t = await getTranslations("notFoundPage");
  const tSeo = await getTranslations("seo");
  return (
    <BrandStatus code="404" title={t("title")} body={t("body")}>
      <Button href="/shop" variant="primary" size="lg">
        {t("shop")}
      </Button>
      <TextLink href="/">{tSeo("home")}</TextLink>
      <TextLink href="/faq">{tSeo("faq")}</TextLink>
    </BrandStatus>
  );
}
