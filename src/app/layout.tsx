import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { NavProgress } from "@/components/NavProgress";
import { Toaster } from "@/components/Toaster";
import { SiteFooter, type SiteTotals } from "@/components/SiteFooter";
import { ViewTracker } from "@/components/ViewTracker";
import { createClient } from "@/lib/supabase/server";
import { SITE_DESC, SITE_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${SITE_NAME}｜鍬形蟲・兜蟲・獨角仙飼育交流與買賣`, template: `%s｜${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: ["甲蟲", "鍬形蟲", "兜蟲", "獨角仙", "金龜", "甲蟲論壇", "甲蟲飼養", "甲蟲買賣", "甲蟲拍賣", "菌瓶", "甲蟲店"],
  openGraph: { siteName: SITE_NAME, locale: "zh_TW", type: "website" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Google Search Console 的 HTML 標記驗證碼：在 Vercel 環境變數填 GOOGLE_SITE_VERIFICATION 即可
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let totals: SiteTotals | null = null;
  try {
    const { data } = await (await createClient()).rpc("site_totals");
    totals = data as SiteTotals | null;
  } catch {
    totals = null;
  }
  return (
    <html lang="zh-Hant-TW">
      <body>
        <Suspense>
          <NavProgress />
          <Toaster />
          <ViewTracker />
        </Suspense>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 pt-5 pb-10 sm:pb-12">{children}</main>
        <SiteFooter totals={totals} />
      </body>
    </html>
  );
}
