import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";
import { siteMessages } from "@/i18n/messages/site";

export const metadata: Metadata = {
  title: "404 | SAMS LLC",
  description: siteMessages.ar.notFound.body,
};

const ar = siteMessages.ar.notFound;
const en = siteMessages.en.notFound;

/*
 * The store and the staff dashboard are separate root layouts, so URLs that
 * match neither (or a notFound() raised outside a store page) land here. The
 * visitor's language is unknown at this level, so the page is bilingual:
 * Arabic first, English beneath, each with its own direction.
 */
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="font-sans antialiased text-gray-900 bg-light-grey min-h-full flex items-center justify-center px-4 py-16">
        <main className="max-w-lg w-full text-center space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Image src="/logo.png" alt="SAMS LLC" width={56} height={56} className="bg-white rounded-full p-1 shadow-md" />
            <span className="font-display text-2xl font-bold text-navy" dir="ltr">SAMS LLC</span>
          </Link>
          <div className="mx-auto bg-fire/10 text-fire p-4 rounded-full w-fit">
            <Flame className="w-10 h-10" aria-hidden="true" />
          </div>
          <p className="font-display text-7xl font-bold text-navy" dir="ltr">404</p>

          <section className="space-y-3">
            <h1 className="font-display text-3xl font-bold text-navy">{ar.title}</h1>
            <p className="text-gray-500">{ar.body}</p>
          </section>

          <section lang="en" dir="ltr" className="space-y-2 border-t border-gray-200 pt-6">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-navy">{en.title}</h2>
            <p className="text-sm text-gray-500">{en.body}</p>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="bg-navy hover:bg-navy/90 text-white text-sm font-bold px-6 py-3 rounded-md transition-colors">
              {ar.home}
            </Link>
            <Link href="/en" lang="en" className="bg-white border border-navy text-navy hover:bg-navy hover:text-white text-sm font-bold px-6 py-3 rounded-md transition-colors">
              {en.home}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
