import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en", "tr"],
  defaultLocale: "ar",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

export const localeDirections: Record<AppLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
  tr: "ltr",
};

export const localeLabels: Record<AppLocale, string> = {
  ar: "العربية",
  en: "English",
  tr: "Türkçe",
};
