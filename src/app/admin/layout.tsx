import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, isMod } from "@/lib/auth";

export const metadata: Metadata = { title: "管理後台", robots: { index: false, follow: false } };

const NAV = [
  ["/admin", "總覽"],
  ["/admin/reports", "檢舉"],
  ["/admin/disputes", "申訴"],
  ["/admin/content", "內容"],
  ["/admin/users", "會員"],
  ["/admin/species", "物種"],
  ["/admin/shops", "店家"],
  ["/admin/words", "禁用詞"],
  ["/admin/log", "紀錄"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // 非版主一律回 404，不透露後台存在。真正的權限檢查在資料庫（RLS 與函式）。
  if (!session || !isMod(session.profile)) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none]" aria-label="管理後台">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="tab">
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
