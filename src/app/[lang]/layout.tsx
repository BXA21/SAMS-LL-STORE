import type { Metadata } from "next";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { getSiteUrl } from "@/lib/siteUrl";
import { directionOf } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
import { siteMessages } from "@/i18n/messages/site";
import { generateLocaleParams, localeAlternates, resolveLocale, type LangParams } from "@/i18n/server";

// /ar (served at the bare paths) and /en are prerendered. dynamicParams stays
// on so products added after a deploy can render; any other locale value is a
// 404 via resolveLocale().
export const generateStaticParams = generateLocaleParams;

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { meta } = siteMessages[locale];
  return {
    title: meta.title,
    description: meta.description,
    metadataBase: new URL(getSiteUrl()),
    alternates: localeAlternates(locale, "/"),
    icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: "/",
      siteName: "SAMS LLC",
      locale: meta.ogLocale,
      type: "website",
      images: [{ url: "/hero_bg.png", width: 1024, height: 531, alt: meta.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: ["/hero_bg.png"],
    },
  };
}

export default async function StoreLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: LangParams;
}>) {
  const locale = await resolveLocale(params);
  const t = siteMessages[locale];
  return (
    <html lang={locale} dir={directionOf(locale)} className="h-full scroll-smooth">
      <body className="font-sans antialiased text-gray-900 bg-white min-h-full flex flex-col">
        <I18nProvider locale={locale}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[60] focus:bg-white focus:text-navy focus:px-4 focus:py-2 focus:rounded-md focus:shadow"
          >
            {t.skipToContent}
          </a>
          <Header />
          <main id="main" className="flex-grow">
            {children}
          </main>
          <CartDrawer />
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
