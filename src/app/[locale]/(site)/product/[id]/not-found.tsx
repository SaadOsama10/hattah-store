import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { BrandStatus } from "@/components/ui/BrandStatus";

export default async function ProductNotFound() {
  const t = await getTranslations("product");
  const tCommon = await getTranslations("common");
  return (
    <BrandStatus code="404" title={t("notFound")} body={t("notFoundBody")}>
      <Button href="/shop" variant="primary" size="lg">
        {tCommon("backToShop")}
      </Button>
    </BrandStatus>
  );
}
