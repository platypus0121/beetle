import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS } from "@/lib/constants";
import { price, timeAgo } from "@/lib/format";
import { Empty, PageHeader, Tabs } from "@/components/ui";

export const metadata: Metadata = { title: "我的交易", robots: { index: false } };

const OPEN = ["requested", "awaiting_payment", "payment_reported", "paid", "shipped", "disputed"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ role?: string; show?: string }> }) {
  const session = await requireSession("/orders");
  const sp = await searchParams;
  const role = sp.role === "seller" ? "seller" : "buyer";
  const show = sp.show === "done" ? "done" : "open";
  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select("id, status, amount, source, created_at, pay_by, listing:listings(id, title), buyer:profiles!orders_buyer_id_fkey(id, username), seller:profiles!orders_seller_id_fkey(id, username)")
    .eq(role === "seller" ? "seller_id" : "buyer_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  q = show === "open" ? q.in("status", OPEN) : q.in("status", ["completed", "cancelled"]);
  const { data } = await q;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="我的交易"
        action={
          <Link href="/me/bids" className="btn btn-sm">
            我的出價
          </Link>
        }
      />
      <Tabs
        current={role}
        items={[
          { key: "buyer", label: "我買的", href: `/orders?show=${show}` },
          { key: "seller", label: "我賣的", href: `/orders?role=seller&show=${show}` },
        ]}
      />
      <div className="mb-3 flex gap-2">
        <Link href={`/orders?role=${role}`} className={`chip min-h-8 px-3 ${show === "open" ? "chip-accent" : ""}`}>
          進行中
        </Link>
        <Link href={`/orders?role=${role}&show=done`} className={`chip min-h-8 px-3 ${show === "done" ? "chip-accent" : ""}`}>
          已結束
        </Link>
      </div>
      {!data?.length ? (
        <Empty title={show === "open" ? "沒有進行中的交易" : "還沒有結束的交易"} action={<Link href="/market" className="btn btn-sm">逛逛交易區</Link>} />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((o) => (
            <li key={o.id} className="relative py-3">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/orders/${o.id}`} className="truncate font-medium after:absolute after:inset-0">
                  {o.listing?.title ?? "（商品已刪除）"}
                </Link>
                <span className={`chip shrink-0 ${o.status === "disputed" ? "chip-danger" : o.status === "completed" || o.status === "cancelled" ? "" : "chip-accent"}`}>
                  {ORDER_STATUS[o.status as keyof typeof ORDER_STATUS]}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-sub">
                #{o.id}・{price(o.amount)}・{o.source === "auction" ? "拍賣得標" : "直購"}・{role === "seller" ? `買家 ${o.buyer?.username}` : `賣家 ${o.seller?.username}`}・{timeAgo(o.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
