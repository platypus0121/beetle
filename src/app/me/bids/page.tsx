import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { price } from "@/lib/format";
import { endsIn } from "@/components/ListingCard";
import { Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "我的出價", robots: { index: false } };

export default async function MyBidsPage() {
  const { userId } = await requireSession("/me/bids");
  const supabase = await createClient();
  const { data } = await supabase
    .from("auto_bids")
    .select("max_amount, updated_at, auction:auctions(listing_id, current_price, current_bidder_id, ends_at, status, bid_count, listing:listings(title))")
    .eq("bidder_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="我的出價" sub="你出過價的拍賣。得標後會自動成立交易單。" />
      {!data?.length ? (
        <Empty title="還沒有出價紀錄" action={<Link href="/market?type=auction" className="btn btn-sm">看看拍賣</Link>} />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((b) => {
            const a = b.auction;
            if (!a) return null;
            const leading = a.current_bidder_id === userId;
            const open = a.status === "open" && new Date(a.ends_at) > new Date();
            const label = open ? (leading ? "領先中" : "已被超過") : a.status === "ended_sold" ? (leading ? "得標" : "未得標") : a.status === "cancelled" ? "已取消" : "流標";
            return (
              <li key={a.listing_id} className="relative py-3">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/market/${a.listing_id}`} className="truncate font-medium after:absolute after:inset-0">
                    {a.listing?.title}
                  </Link>
                  <span className={`chip shrink-0 ${label === "領先中" || label === "得標" ? "chip-accent" : label === "已被超過" ? "chip-warn" : ""}`}>{label}</span>
                </div>
                <p className="mt-0.5 text-xs text-sub">
                  目前 {price(a.current_price)}・我的上限 {price(b.max_amount)}・{a.bid_count} 次出價{open && `・${endsIn(a.ends_at)}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
