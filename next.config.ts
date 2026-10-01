import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// The exact Supabase origin this build talks to (plus its websocket form).
function supabaseOrigins(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const ws = url.protocol === "https:" ? `wss://${url.host}` : `ws://${url.host}`;
    return `${url.origin} ${ws}`;
  } catch {
    return "";
  }
}

// Next.js injects inline bootstrap scripts, so script-src keeps 'unsafe-inline';
// everything else is locked to this site, Supabase and Paymob.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseOrigins()} https://*.supabase.co wss://*.supabase.co`.replace(/\s+/g, " "),
  "frame-src 'self' https://oman.paymob.com https://www.google.com https://maps.google.com",
  "form-action 'self' https://oman.paymob.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Branded bilingual 404 (app/global-not-found.tsx): the store and the staff
  // dashboard are separate root layouts, so there is no single root not-found.
  experimental: {
    globalNotFound: true,
  },
  // Only local product photos are optimised (no remote hosts are allowed), in
  // one format and a short size ladder, cached for a month so optimisation runs
  // once per variant rather than per visitor.
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [80, 160, 320],
    minimumCacheTTL: 2678400,
  },
  /*
   * Arabic is the default language and is served at the bare paths; English
   * lives under /en. Both are prerendered under app/[lang], and these rules run
   * in the platform router, so choosing a language costs no server compute.
   * afterFiles runs after public files and API routes are matched, so assets,
   * /api and /admin are never rewritten.
   */
  async redirects() {
    return [
      { source: "/ar", destination: "/", permanent: true },
      { source: "/ar/:path*", destination: "/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/", destination: "/ar" },
        { source: "/:path((?!en(?:/|$)|ar(?:/|$)|api(?:/|$)|admin(?:/|$)|_next/).+)", destination: "/ar/:path" },
      ],
      fallback: [],
    };
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
