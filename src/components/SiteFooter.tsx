"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 頁尾在手機上也顯示：讓搜尋引擎（行動版優先索引）從每一頁都找得到主要分類。
// 私訊對話頁是滿版設計，不顯示頁尾。
export type SiteTotals = { today_views: number; today_visitors: number; total_views: number };

export function SiteFooter({ totals }: { totals: SiteTotals | null }) {
  const path = usePathname();
  if (/^\/messages\/\d+/.test(path)) return null;
  return (
    <footer className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-2 border-t border-line px-4 pt-6 pb-24 text-xs text-sub sm:pb-6">
      <Link href="/market">甲蟲買賣</Link>
      <Link href="/species">甲蟲品種</Link>
      <Link href="/shops">全台甲蟲店</Link>
      <Link href="/breeding/public">飼育紀錄</Link>
      <Link href="/rules">站規</Link>
      <Link href="/market/guide">交易注意事項</Link>
      <Link href="/terms">服務條款</Link>
      <Link href="/privacy">隱私權政策</Link>
      <span className="w-full sm:ml-auto sm:w-auto">本站不代收代付、不經手任何款項</span>
      {totals && (
        <p className="w-full tabular-nums text-faint">
          今日瀏覽 {totals.today_views.toLocaleString("en-US")}・今日訪客 {totals.today_visitors.toLocaleString("en-US")}・累計瀏覽 {totals.total_views.toLocaleString("en-US")}
        </p>
      )}
    </footer>
  );
}
