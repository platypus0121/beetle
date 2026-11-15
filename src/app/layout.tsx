import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { NavProgress } from "@/components/NavProgress";
import { Toaster } from "@/components/Toaster";
import { SITE_DESC, SITE_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${SITE_NAME}｜鍬形蟲・兜蟲・金龜`, template: `%s｜${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: "zh_TW", type: "website" },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <body>
        <Suspense>
          <NavProgress />
          <Toaster />
        </Suspense>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 pt-5 pb-24 sm:pb-12">{children}</main>
        <footer className="mx-auto hidden max-w-5xl flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-6 text-xs text-sub sm:flex">
          <Link href="/rules">站規</Link>
          <Link href="/market/guide">交易注意事項</Link>
          <Link href="/terms">服務條款</Link>
          <Link href="/privacy">隱私權政策</Link>
          <span className="ml-auto">本站不代收代付、不經手任何款項</span>
        </footer>
      </body>
    </html>
  );
}
