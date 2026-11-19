import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, localeDirections, type AppLocale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import { THEME_INIT_SCRIPT, ThemeSync } from "@/components/ui/ThemeToggle";
import "../globals.css";

// Display / heading fonts — the brand's identity faces (same as the logo and the
// social-media templates): Playfair Display for Latin, Amiri for Arabic.
// Amiri Bold, self-hosted subset (Arabic letters/marks/digits + basic punctuation, the
// shaping features Arabic needs; ornamental alternates dropped) — 40 KB vs 100 KB for Google's file.
const amiri = localFont({
  src: [{ path: "../fonts/amiri-ar-700.woff2", weight: "700", style: "normal" }],
  variable: "--font-amiri",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

// Body / UI font — clean and modern: Inter (Latin) or IBM Plex Sans Arabic (Arabic).
const inter = Inter({
  // Latin only (as before the redesign): latin-ext would add ~85 KB of fonts on every page.
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter-latin",
  display: "swap",
  preload: false,
});

// Self-hosted subset (Arabic block + basic Latin/digits/punctuation), ~25 KB per weight.
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
      <head>
        {/* Product photos (incl. the homepage hero, the usual LCP image) come from Supabase Storage:
            open that connection while the HTML is still parsing. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />}
        {/* Playfair Display (self-hosted, see globals.css) is the headline font on /en and /tr:
            preloaded there only, so Arabic pages don't pay for it. */}
        {!isArabic && (
          <link rel="preload" href="/fonts/playfair-700-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        )}
      </head>
      <body
        // Only the active locale's font families are applied, so /en and /tr never download (or preload)
        // the Arabic fonts and /ar never downloads the Latin ones.
        className={`${isArabic ? `${amiri.variable} ${ibmPlexSansArabic.variable}` : inter.variable} bg-bg-primary text-cream antialiased font-inter`}
        style={
          {
            "--font-display-current": isArabic
              ? "var(--font-amiri)"
              : "var(--font-playfair-latin)",
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
