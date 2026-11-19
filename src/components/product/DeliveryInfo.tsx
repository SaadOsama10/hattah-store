import { getTranslations } from "next-intl/server";
import { ArrowRight, Handshake, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** How ordering works, under the buy buttons — no delivery areas, fees or times. */
export async function DeliveryInfo() {
  const t = await getTranslations("product");
  const rows = [
    { Icon: MessageCircle, text: t("deliveryOrder") },
    { Icon: Handshake, text: t("orderDetails") },
  ];
  return (
    <section aria-labelledby="delivery-info" className="rounded-card bg-bg-secondary p-4 ring-1 ring-line sm:p-5">
      <h2 id="delivery-info" className="font-inter text-sm font-semibold text-cream">
        {t("deliveryTitle")}
      </h2>
      <ul className="mt-3 space-y-3">
        {rows.map(({ Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-olive-wash text-olive">
              <Icon size={16} strokeWidth={1.6} />
            </span>
            <p className="font-inter text-sm leading-relaxed text-cream-secondary">{text}</p>
          </li>
        ))}
      </ul>
      <Link href="/shipping" className="group mt-3 inline-flex min-h-10 items-center gap-1 font-inter text-sm font-semibold text-terracotta hover:text-cream">
        {t("deliveryMore")}
        <ArrowRight size={15} className="rtl:-scale-x-100" />
      </Link>
    </section>
  );
}
