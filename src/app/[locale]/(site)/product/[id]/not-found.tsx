import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";

export default async function ProductNotFound() {
  const t = await getTranslations("product");
  const tCommon = await getTranslations("common");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 pt-24 text-center">
      <h1 className="font-playfair text-4xl font-bold text-cream">{t("notFound")}</h1>
      <Divider className="my-6" />
      <p className="max-w-md font-inter text-cream-secondary/70">{t("notFoundBody")}</p>
      <div className="mt-10">
        <Button href="/shop" variant="primary">
          {tCommon("backToShop")}
        </Button>
      </div>
    </div>
  );
}
