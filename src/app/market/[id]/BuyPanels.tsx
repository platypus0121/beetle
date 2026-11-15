"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormError, Submit } from "@/components/Submit";
import { SHIPPING } from "@/lib/constants";
import { formatDateTime, price } from "@/lib/format";
import { toast } from "@/components/Toaster";
import { buyNow, cancelAuction, createOrder, placeBid } from "../actions";

function Agree() {
  return (
    <label className="flex items-start gap-2 text-sm text-sub">
      <input type="checkbox" name="agreed" required className="mt-1 size-4 accent-accent" />
      <span>
        我已閱讀
        <Link href="/market/guide" target="_blank" className="text-accent underline">
          交易注意事項
        </Link>
        ：付款資訊只看交易單、活體到貨死亡需附一刀未剪的開箱影片。
      </span>
    </label>
  );
}

export function OrderPanel({ listingId, shipping }: { listingId: number; shipping: string[] }) {
  const [state, action] = useActionState(createOrder, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="listing_id" value={listingId} />
      <FormError state={state} />
      <div>
        <label className="label" htmlFor="shipping">
          寄送方式
        </label>
        <select id="shipping" name="shipping" className="input" required>
          {shipping.map((s) => (
            <option key={s} value={s}>
              {SHIPPING[s as keyof typeof SHIPPING]}
            </option>
          ))}
        </select>
      </div>
      <textarea name="note" rows={2} maxLength={500} placeholder="給賣家的話（選填）" className="input" />
      <Agree />
      <Submit className="btn btn-primary w-full">我要購買</Submit>
      <p className="text-xs text-sub">送出後等待賣家確認；賣家接受後會在交易單提供收款資訊。</p>
    </form>
  );
}

export type AuctionState = {
  current_price: number;
  bid_count: number;
  ends_at: string;
  status: string;
  min_increment: number;
  start_price: number;
  buy_now_price: number | null;
  has_reserve: boolean;
  reserve_met: boolean;
  current_bidder_id: string | null;
};
export type BidRow = { id: number; bidder: string; is_me: boolean; amount: number; is_auto: boolean; created_at: string };

function useCountdown(endsAt: string) {
  // 伺服器與瀏覽器的時間不同，掛載後才開始計時，避免 hydration 不一致
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((new Date(endsAt).getTime() - (now ?? new Date(endsAt).getTime() - 1000)) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const text = s <= 0 ? "已結標" : d > 0 ? `${d} 天 ${h} 小時` : h > 0 ? `${h} 小時 ${m} 分` : `${m} 分 ${s % 60} 秒`;
  if (now === null) return { ended: false, urgent: false, text: "…" };
  return { ended: s <= 0, urgent: s > 0 && s < 300, text };
}

export function AuctionPanel({
  listingId,
  initial,
  bids,
  viewerId,
  isSeller,
  myMax,
  canBid,
  blockReason,
}: {
  listingId: number;
  initial: AuctionState;
  bids: BidRow[];
  viewerId: string | null;
  isSeller: boolean;
  myMax: number | null;
  canBid: boolean;
  blockReason: string | null;
}) {
  const [a, setA] = useState(initial);
  const [bidState, bidAction] = useActionState(placeBid, null);
  const [buyState, buyAction] = useActionState(buyNow, null);
  const [cancelState, cancelAction] = useActionState(cancelAuction, null);
  const router = useRouter();
  const cd = useCountdown(a.ends_at);

  useEffect(() => setA(initial), [initial]);
  useEffect(() => {
    if (bidState?.ok) toast(bidState.data.leading ? "出價成功，你目前領先" : "出價已送出，但目前被超過", bidState.data.leading ? "ok" : "error");
  }, [bidState]);
  // 即時更新價格與結標時間
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`auction-${listingId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auctions", filter: `listing_id=eq.${listingId}` }, (payload) => {
        setA((prev) => ({ ...prev, ...(payload.new as AuctionState) }));
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [listingId, router]);
  useEffect(() => {
    if (cd.ended && a.status === "open") {
      const t = setTimeout(() => router.refresh(), 5000);
      return () => clearTimeout(t);
    }
  }, [cd.ended, a.status, router]);

  const open = a.status === "open" && !cd.ended;
  const leading = !!viewerId && a.current_bidder_id === viewerId;
  const minBid = a.bid_count === 0 ? a.start_price : a.current_price + a.min_increment;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-sub">{a.bid_count ? "目前出價" : "起標價"}</div>
          <div className="text-2xl font-semibold text-accent">{price(a.current_price)}</div>
          <div className="text-xs text-sub">
            {a.bid_count} 次出價・每口 {price(a.min_increment)}
          </div>
        </div>
        <div>
          <div className="text-xs text-sub">{open ? "距離結標" : "狀態"}</div>
          <div className={`text-lg font-semibold ${cd.urgent ? "text-danger" : ""}`} aria-live="polite">
            {a.status === "cancelled" ? "已取消" : a.status === "ended_sold" ? "已結標（成交）" : a.status === "ended_unsold" ? "已結標（流標）" : cd.text}
          </div>
          <div className="text-xs text-sub">結標 {formatDateTime(a.ends_at)}</div>
        </div>
      </div>
      {a.has_reserve && open && <p className={`chip ${a.reserve_met ? "chip-accent" : "chip-warn"}`}>{a.reserve_met ? "已達底價" : "尚未達到賣家底價"}</p>}
      {leading && open && <p className="notice">你目前是最高出價者{myMax ? `，自動出價上限 ${price(myMax)}` : ""}。</p>}
      {!leading && myMax && open && <p className="notice notice-warn">你的出價已被超過（你的上限 {price(myMax)}）。</p>}

      {open && !isSeller && (
        canBid ? (
          <>
            <form action={bidAction} className="space-y-3">
              <input type="hidden" name="listing_id" value={listingId} />
              <FormError state={bidState} />
              {bidState?.ok && (
                <p className={`notice ${bidState.data.leading ? "" : "notice-warn"}`}>
                  {bidState.data.leading ? "出價成功，你目前領先。" : "出價成功，但有人設定了更高的自動出價，你被超過了。"}
                  {bidState.data.extended && " 結標時間已延長 5 分鐘。"}
                </p>
              )}
              <div>
                <label className="label" htmlFor="amount">
                  {leading ? "提高自動出價上限" : "你的最高出價"}（至少 {price(leading ? (myMax ?? a.current_price) + 1 : minBid)}）
                </label>
                <input id="amount" name="amount" type="number" inputMode="numeric" required step="1" min={leading ? (myMax ?? a.current_price) + 1 : minBid} defaultValue={leading ? undefined : minBid} className="input" />
                <p className="hint">填你願意出的最高金額，系統只會以「剛好贏過別人」的最低價替你出價，上限不會公開。</p>
              </div>
              <Agree />
              <Submit className="btn btn-primary w-full">出價</Submit>
            </form>
            {a.buy_now_price && a.bid_count === 0 && (
              <form action={buyAction} className="space-y-2 border-t border-line pt-3">
                <input type="hidden" name="listing_id" value={listingId} />
                <FormError state={buyState} />
                <Agree />
                <Submit className="btn w-full">以直購價 {price(a.buy_now_price)} 買下</Submit>
              </form>
            )}
          </>
        ) : (
          <p className="notice">
            {blockReason ?? (
              <>
                <Link href={`/login?next=/market/${listingId}`} className="text-accent underline">
                  登入
                </Link>
                後即可出價。
              </>
            )}
          </p>
        )
      )}

      {open && isSeller && (
        <details className="text-sm">
          <summary className="cursor-pointer text-sub">取消拍賣</summary>
          <form action={cancelAction} className="mt-2 space-y-2">
            <input type="hidden" name="listing_id" value={listingId} />
            <FormError state={cancelState} />
            <textarea name="reason" required minLength={5} maxLength={300} rows={2} placeholder="取消原因（會通知所有出價者）" className="input" />
            {a.bid_count > 0 && <p className="text-xs text-warn">已有人出價，取消會扣信用分 5 分。</p>}
            <Submit className="btn btn-danger btn-sm">確定取消拍賣</Submit>
          </form>
        </details>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold">出價紀錄</h3>
        {bids.length === 0 ? (
          <p className="text-sm text-sub">還沒有人出價。</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {bids.slice(0, 20).map((b) => (
              <li key={b.id} className="flex items-center justify-between py-1.5">
                <span className={b.is_me ? "font-medium text-accent" : ""}>
                  {b.is_me ? "你" : b.bidder}
                  {b.is_auto && <span className="ml-1 text-xs text-faint">自動</span>}
                </span>
                <span className="text-xs text-faint">{formatDateTime(b.created_at)}</span>
                <span className="w-24 text-right font-medium">{price(b.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
