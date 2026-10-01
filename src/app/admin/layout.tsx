import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "SAMS Staff Dashboard",
  robots: { index: false, follow: false },
};

/* Staff-only tool: its own root layout, English and left-to-right, without the storefront chrome. */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className="h-full">
      <body className="font-sans antialiased text-gray-900 bg-white min-h-full">{children}</body>
    </html>
  );
}
