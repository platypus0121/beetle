import type { Metadata } from "next";
import Link from "next/link";
import { requireSession, isBanned, isMod } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Avatar } from "@/components/ui";

export const metadata: Metadata = { title: "我的", robots: { index: false } };

export default async function MePage() {
  const { profile, userId } = await requireSession("/me");
  const supabase = await createClient();
  const [{ count: openOrders }, { count: friendReqs }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).not("status", "in", "(completed,cancelled)"),
    supabase.from("friendships").select("id", { count: "exact", head: true }).eq("addressee_id", userId).eq("status", "pending"),
  ]);
  const links: { href: string; label: string; badge?: number | null }[] = [
    { href: "/orders", label: "我的交易", badge: openOrders },
    { href: "/me/bids", label: "我的出價" },
    { href: `/u/${userId}?tab=listings`, label: "我的賣場" },
    { href: "/breeding", label: "飼育紀錄" },
    { href: "/friends", label: "好友", badge: friendReqs },
    { href: "/messages", label: "私訊" },
    { href: "/notifications", label: "通知" },
    { href: "/me/bookmarks", label: "收藏" },
    { href: "/shops", label: "甲蟲店名錄" },
    { href: "/settings", label: "設定" },
  ];
  if (isMod(profile)) links.push({ href: "/admin", label: "管理後台" });
  return (
    <div className="mx-auto max-w-md">
      <Link href={`/u/${userId}`} className="flex items-center gap-3">
        <Avatar path={profile.avatar_path} name={profile.username} size={56} />
        <div>
          <div className="text-lg font-semibold">{profile.username}</div>
          <div className="text-xs text-sub">信用分 {profile.credit_score}・完成交易 {profile.completed_orders}・查看個人頁 ›</div>
        </div>
      </Link>
      {isBanned(profile) && (
        <p className="notice notice-danger mt-4">
          帳號停權至 {formatDateTime(profile.banned_until!)}。{profile.ban_reason && `原因：${profile.ban_reason}`}
        </p>
      )}
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex min-h-12 items-center justify-between text-[15px] hover:bg-wash">
              {l.label}
              <span className="flex items-center gap-2 text-faint">
                {!!l.badge && <span className="rounded-full bg-danger px-1.5 text-[11px] leading-5 text-white">{l.badge}</span>}›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub sm:hidden">
        <Link href="/rules">站規</Link>
        <Link href="/market/guide">交易注意事項</Link>
        <Link href="/terms">服務條款</Link>
        <Link href="/privacy">隱私權政策</Link>
      </div>
      <form action="/auth/signout" method="post" className="mt-6">
        <button className="btn w-full">登出</button>
      </form>
    </div>
  );
}
