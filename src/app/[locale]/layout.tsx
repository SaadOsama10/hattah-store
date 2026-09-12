import type { Metadata } from "next";
import { Sora, Noto_Kufi_Arabic, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, localeDirections, type AppLocale } from "@/i18n/routing";
import { THEME_INIT_SCRIPT, ThemeSync } from "@/components/ui/ThemeToggle";
import "../globals.css";

// Display / heading font — bold, modern, geometric. Used for both
// languages via the --font-playfair CSS variable, which resolves to
// Sora (Latin) or Noto Kufi Arabic (Arabic) — see globals.css.
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-noto-kufi-arabic",
  display: "swap",
});

// Body / UI font — clean and modern. Used via the --font-inter CSS
// variable, which resolves to Inter (Latin) or IBM Plex Sans Arabic
// (Arabic).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-latin",
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    icons: {
      icon: "/icon.png",
      apple: "/apple-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const dir = localeDirections[locale as AppLocale];
  const isArabic = locale === "ar";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${sora.variable} ${notoKufiArabic.variable} ${inter.variable} ${ibmPlexSansArabic.variable} bg-bg-primary text-cream antialiased font-inter`}
        style={
          {
            "--font-display-current": isArabic
              ? "var(--font-noto-kufi-arabic)"
              : "var(--font-sora)",
            "--font-body-current": isArabic
              ? "var(--font-ibm-plex-sans-arabic)"
              : "var(--font-inter-latin)",
          } as React.CSSProperties
        }
      >
        <script
          // Runs before hydration to set the stored theme and avoid a
          // flash of the wrong (default light) theme on a genuine first
          // page load.
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/* Re-applies the stored theme on every render of this layout —
            including the client-side re-render triggered by switching
            locale, which the inline script above (load-once) can't
            cover. See ThemeSync's own comment for the full why. */}
        <ThemeSync />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
