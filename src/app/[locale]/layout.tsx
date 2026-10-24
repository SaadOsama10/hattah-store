import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, localeDirections, type AppLocale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import { THEME_INIT_SCRIPT, ThemeSync } from "@/components/ui/ThemeToggle";
import "../globals.css";

// Display / heading font — bold, modern, geometric. Used for both
// languages via the --font-playfair CSS variable, which resolves to
// Sora (Latin) or Noto Kufi Arabic (Arabic) — see globals.css.
const sora = Sora({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-sora",
  display: "swap",
});

// Arabic fonts are self-hosted subsets (Arabic block + basic Latin/digits/punctuation), ~25 KB per weight
// instead of the full 124 KB Google file. Only the weights painted above the fold are preloaded.
const notoKufiArabic = localFont({
  src: [
    { path: "../fonts/kufi-ar-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/kufi-ar-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-noto-kufi-arabic",
  display: "swap",
  adjustFontFallback: "Arial",
});

// Body / UI font — clean and modern. Used via the --font-inter CSS
// variable, which resolves to Inter (Latin) or IBM Plex Sans Arabic
// (Arabic).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter-latin",
  display: "swap",
});

const ibmPlexSansArabic = localFont({
  src: [
    { path: "../fonts/plex-ar-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plex-ar-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-ibm-plex-sans-arabic",
  display: "swap",
  adjustFontFallback: "Arial",
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
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    applicationName: "HATTAH",
    // Search Console / Bing verification (meta-tag method) come from env so they can be
    // added without code changes; see lib/site.ts for the single site-URL config.
    verification: {
      google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
      other: process.env.NEXT_PUBLIC_BING_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION } : undefined,
    },
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
        // Only the active locale's font families are applied, so /en and /tr never download (or preload)
        // the Arabic fonts and /ar never downloads the Latin ones.
        className={`${isArabic ? `${notoKufiArabic.variable} ${ibmPlexSansArabic.variable}` : `${sora.variable} ${inter.variable}`} bg-bg-primary text-cream antialiased font-inter`}
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
