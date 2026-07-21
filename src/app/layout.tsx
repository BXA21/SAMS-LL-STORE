import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { getSiteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "SAMS Oman | Automatic Fire Extinguisher Balls & Fire Safety Solutions",
  description: "SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC provides automatic fire extinguisher balls, fire safety devices, and advanced fire protection solutions for homes, offices, vehicles, warehouses, and industrial spaces in Oman.",
  metadataBase: new URL(getSiteUrl()),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "SAMS Oman | Automatic Fire Extinguisher Balls & Fire Safety Solutions",
    description: "SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC provides automatic fire extinguisher balls, fire safety devices, and advanced fire protection solutions for homes, offices, vehicles, warehouses, and industrial spaces in Oman.",
    url: "/",
    siteName: "SAMS LLC",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/hero_bg.png",
        width: 1024,
        height: 531,
        alt: "SAMS automatic fire extinguisher ball and flower pot extinguisher",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SAMS Oman | Automatic Fire Extinguisher Balls & Fire Safety Solutions",
    description: "SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC provides automatic fire extinguisher balls, fire safety devices, and advanced fire protection solutions for homes, offices, vehicles, warehouses, and industrial spaces in Oman.",
    images: ["/hero_bg.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="font-sans antialiased text-gray-900 bg-white min-h-full flex flex-col">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <CartDrawer />
        <Footer />
      </body>
    </html>
  );
}

