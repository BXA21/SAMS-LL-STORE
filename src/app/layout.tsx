import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: "SAMS Oman | Automatic Fire Extinguisher Balls & Fire Safety Solutions",
  description: "SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC provides automatic fire extinguisher balls, fire safety devices, and advanced fire protection solutions for homes, offices, vehicles, warehouses, and industrial spaces in Oman.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
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

