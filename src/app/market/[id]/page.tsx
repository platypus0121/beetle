import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, isBanned, isMod } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediaFor } from "@/lib/queries";
import { LISTING_STATUS, LIVE_STAGES, SEXES, SHIPPING, STAGES } from "@/lib/constants";
import { formatDate, price, timeAgo } from "@/lib/format";
import { Gallery } from "@/components/Gallery";
import { ReportButton } from "@/components/ReportButton";
import { RichText } from "@/components/RichText";
import { ToggleButton } from "@/components/Toggles";
import { Avatar, Stars } from "@/components/ui";
import { toggleBookmark } from "@/app/posts/actions";
import { setListingStatus } from "../actions";
import { AuctionPanel, OrderPanel, type AuctionState, type BidRow } from "./BuyPanels";
import { DeleteListing } from "./DeleteListing";
import { StickyBuyBar } from "./StickyBuyBar";
import { endsIn } from "@/components/ListingCard";

async function load(id: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("*, seller:profiles!listings_seller_id_fkey(id, username, avatar_path, credit_score, completed_orders, strikes, created_at, city), species(id, common_name, scientific_name, japanese_name), auctions(*)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await load(Number(id) || 0);
  if (!l || l.status === "hidden") return { title: "商品", robots: { index: false } };
  const cover = (await mediaFor("listing", [l.id])).get(l.id)?.find((m) => m.kind === "image")?.url;
  const desc = `${price(l.price)}・${STAGES[l.stage as keyof typeof STAGES]}${l.scientific_name ? `・${l.scientific_name}` : ""}`;
  return { title: l.title, description: desc, alternates: { canonical: `/market/${l.id}` }, openGraph: { title: l.title, description: desc, images: cover ? [cover] : undefined } };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listingId = Number(id) || 0;
  const [l, session] = await Promise.all([load(listingId), getSession()]);
  if (!l || !l.seller) notFound();
  const supabase = await createClient();
  const viewerId = session?.userId ?? null;
  const mine = viewerId === l.seller_id;
  const mod = session ? isMod(session.profile) : false;
  const auction = l.sale_type === "auction" ? l.auctions : null;
  const live = LIVE_STAGES.includes(l.stage);

  const [media, rating, markRes, bidsRes, myAuto, myOrder, blocked] = await Promise.all([
    mediaFor("listing", [listingId]),
    supabase.from("profile_ratings").select("avg_rating, review_count").eq("user_id", l.seller_id).maybeSingle(),
    viewerId ? supabase.from("bookmarks").select("target_id").eq("user_id", viewerId).eq("target_type", "listing").eq("target_id", listingId).maybeSingle() : null,
    auction ? supabase.rpc("auction_bid_history", { p_listing: listingId }) : null,
    auction && viewerId ? supabase.from("auto_bids").select("max_amount").eq("listing_id", listingId).eq("bidder_id", viewerId).maybeSingle() : null,
    viewerId ? supabase.from("orders").select("id, status").eq("listing_id", listingId).order("id", { ascending: false }).limit(1).maybeSingle() : null,
    viewerId && !mine ? supabase.rpc("is_blocked_between", { a: viewerId, b: l.seller_id }) : null,
  ]);

  const sellerAgeDays = Math.floor((Date.now() - new Date(l.seller.created_at).getTime()) / 86400_000);
  const warnings: string[] = [];
  if (sellerAgeDays < 14) warnings.push(`賣家註冊僅 ${sellerAgeDays} 天`);
  if (l.seller.completed_orders === 0) warnings.push("賣家尚無完成的交易");
  if (l.seller.credit_score < 90) warnings.push(`賣家信用分偏低（${l.seller.credit_score}）`);

  let blockReason: string | null = null;
  if (session) {
    if (isBanned(session.profile)) blockReason = "帳號停權中，無法交易。";
    else if (blocked?.data) blockReason = "無法與此賣家交易。";
    else if (auction && Date.now() - new Date(session.profile.created_at).getTime() < 86400_000) blockReason = "註冊滿 24 小時後才能出價。";
    else if (auction && session.profile.strikes >= 3) blockReason = "棄標紀錄達 3 次，已停止出價權限。";
  }

  const specs: [string, React.ReactNode][] = [];
  if (l.species)
    specs.push([
      "物種",
      <Link key="s" href={`/species/${l.species.id}`} className="text-accent">
        {l.species.common_name}
      </Link>,
    ]);
  if (l.scientific_name) specs.push(["學名", <span key="sci" className="sci">{l.scientific_name}</span>]);
  if (l.species?.japanese_name) specs.push(["日文名", l.species.japanese_name]);
  specs.push(["類型", STAGES[l.stage as keyof typeof STAGES]]);
  if (l.stage !== "supply") {
    specs.push(["性別", SEXES[l.sex as keyof typeof SEXES]]);
    if (l.size_mm) specs.push(["尺寸", `${l.size_mm} mm`]);
    if (l.generation) specs.push(["累代", l.generation]);
    if (l.origin) specs.push(["產地", `${l.origin}${l.origin_is_taiwan ? "（台灣產）" : ""}`]);
    if (l.emerged_on) specs.push(["羽化日", formatDate(l.emerged_on)]);
  }
  specs.push(["寄送方式", l.shipping_methods.map((s) => SHIPPING[s as keyof typeof SHIPPING]).join("、")]);
  if (l.city) specs.push(["所在地", l.city]);
  // 規格用兩欄緊湊排列；學名與寄送方式較長佔整列，半寬格子是奇數時最後一格補滿
  const WIDE = new Set(["學名", "寄送方式"]);
  const halves = specs.filter(([k]) => !WIDE.has(k));
  const lastHalf = halves.length % 2 ? halves[halves.length - 1][0] : null;

  const activeOrder = myOrder?.data && !["completed", "cancelled"].includes(myOrder.data.status) ? myOrder.data : null;
  const auctionOpen = !!auction && auction.status === "open" && new Date(auction.ends_at).getTime() > Date.now();
  let cta: { label: string; href?: string } | null = null;
  if (!mine) {
    if (activeOrder) cta = { label: "查看交易單", href: `/orders/${activeOrder.id}` };
    else if (l.status === "active" && !blockReason && (auction ? auctionOpen : true))
      cta = session ? { label: auction ? "出價" : "我要購買" } : { label: auction ? "登入出價" : "登入購買", href: `/login?next=/market/${listingId}` };
  }
  const barPrice = auction ? price(auction.current_price) : price(l.price);
  const barSub = auction ? `${auction.bid_count} 次出價・${endsIn(auction.ends_at)}` : l.city ? `${l.city}・${l.shipping_methods.length} 種寄送方式` : undefined;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <Gallery media={media.get(listingId) ?? []} />
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="chip">{STAGES[l.stage as keyof typeof STAGES]}</span>
          {auction && <span className="chip chip-accent">拍賣</span>}
          {l.status !== "active" && <span className="chip chip-warn">{LISTING_STATUS[l.status as keyof typeof LISTING_STATUS]}</span>}
          {l.origin_is_taiwan && live && l.breeding_proof_path && <span className="chip chip-accent">✓ 已附飼育證明</span>}
        </div>
        <h1 className="mt-2 text-xl leading-snug font-semibold">{l.title}</h1>
        {!auction && <p className="mt-1 text-2xl font-semibold text-accent">{price(l.price)}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm">
          {specs.map(([k, v]) => (
            <div key={k} className={`min-w-0 bg-white px-3 py-2 ${WIDE.has(k) || k === lastHalf ? "col-span-2" : ""}`}>
              <dt className="text-xs text-sub">{k}</dt>
              <dd className="mt-0.5 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        {l.description && <RichText text={l.description} className="mt-4 text-[15px]" />}
        <p className="mt-4 text-xs text-faint">上架於 {timeAgo(l.created_at)}</p>
      </div>

      <aside className="space-y-4">
        <div id="buy" className="card scroll-mt-20 p-4">
          {mine ? (
            <div className="space-y-3">
              <p className="text-sm text-sub">這是你的商品。</p>
              {auction ? (
                <AuctionPanel listingId={listingId} initial={auction as AuctionState} bids={(bidsRes?.data ?? []) as BidRow[]} viewerId={viewerId} isSeller myMax={null} canBid={false} blockReason={null} />
              ) : (
                ["active", "closed"].includes(l.status) && (
                  <div className="flex gap-2">
                    <Link href={`/market/${listingId}/edit`} className="btn btn-sm flex-1">
                      編輯
                    </Link>
                    <form action={setListingStatus} className="flex-1">
                      <input type="hidden" name="id" value={listingId} />
                      <input type="hidden" name="status" value={l.status === "active" ? "closed" : "active"} />
                      <button className="btn btn-sm w-full">{l.status === "active" ? "下架" : "重新上架"}</button>
                    </form>
                  </div>
                )
              )}
              {auction && auction.bid_count === 0 && auction.status === "open" && (
                <Link href={`/market/${listingId}/edit`} className="btn btn-sm w-full">
                  編輯說明與照片
                </Link>
              )}
              {myOrder?.data && (
                <Link href="/orders?role=seller" className="btn btn-sm w-full">
                  查看這件商品的交易單
                </Link>
              )}
              <DeleteListing id={listingId} />
            </div>
          ) : auction ? (
            <AuctionPanel
              listingId={listingId}
              initial={auction as AuctionState}
              bids={(bidsRes?.data ?? []) as BidRow[]}
              viewerId={viewerId}
              isSeller={false}
              myMax={myAuto?.data?.max_amount ?? null}
              canBid={!!session && !blockReason}
              blockReason={blockReason}
            />
          ) : l.status !== "active" ? (
            <p className="text-sm text-sub">
              此商品{LISTING_STATUS[l.status as keyof typeof LISTING_STATUS]}。
              {myOrder?.data && (
                <Link href={`/orders/${myOrder.data.id}`} className="ml-1 text-accent underline">
                  查看我的交易單
                </Link>
              )}
            </p>
          ) : !session ? (
            <Link href={`/login?next=/market/${listingId}`} className="btn btn-primary w-full">
              登入後購買
            </Link>
          ) : blockReason ? (
            <p className="notice notice-warn">{blockReason}</p>
          ) : myOrder?.data && !["completed", "cancelled"].includes(myOrder.data.status) ? (
            <Link href={`/orders/${myOrder.data.id}`} className="btn btn-primary w-full">
              查看我的交易單
            </Link>
          ) : (
            <OrderPanel listingId={listingId} shipping={l.shipping_methods} />
          )}
        </div>

        {live && (
          <p className="notice text-xs">
            <strong className="text-ink">活體到貨死亡：</strong>
            收件時請從未拆封開始錄影、一刀未剪拍到確認個體狀況。沒有開箱影片無法受理申訴。
          </p>
        )}

        <div className="card p-4">
          <Link href={`/u/${l.seller.id}`} className="flex items-center gap-3">
            <Avatar path={l.seller.avatar_path} name={l.seller.username} size={44} />
            <div className="min-w-0">
              <div className="truncate font-medium">{l.seller.username}</div>
              <div className="text-xs text-sub">
                {rating.data?.review_count ? (
                  <>
                    <Stars value={Number(rating.data.avg_rating)} /> {rating.data.avg_rating}（{rating.data.review_count}）
                  </>
                ) : (
                  "尚無評價"
                )}
              </div>
            </div>
          </Link>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <dd className="text-base font-semibold">{l.seller.credit_score}</dd>
              <dt className="text-sub">信用分</dt>
            </div>
            <div>
              <dd className="text-base font-semibold">{l.seller.completed_orders}</dd>
              <dt className="text-sub">完成交易</dt>
            </div>
            <div>
              <dd className="text-base font-semibold">{sellerAgeDays}</dd>
              <dt className="text-sub">註冊天數</dt>
            </div>
          </dl>
          {!mine && warnings.length > 0 && <p className="notice notice-warn mt-3 text-xs">請留意：{warnings.join("、")}。付款前先確認商品，不要在私訊提供或接受匯款帳號。</p>}
          {!mine && session && (
            <Link href={`/messages/new?to=${l.seller.id}&listing=${listingId}`} className="btn btn-sm mt-3 w-full">
              私訊詢問
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between">
          <ToggleButton on={!!markRes?.data} action={toggleBookmark.bind(null, "listing", listingId)} labelOn="★ 已收藏" labelOff="☆ 收藏" loggedIn={!!viewerId} />
          <div className="flex items-center gap-3">
            {mod && <Link href={`/admin/content?type=listing&id=${listingId}`} className="text-xs text-sub">管理</Link>}
            {viewerId && !mine && <ReportButton type="listing" id={listingId} label="檢舉商品" />}
          </div>
        </div>
      </aside>
      {cta && (
        <StickyBuyBar
          priceText={barPrice}
          sub={barSub}
          label={cta.label}
          href={cta.href}
          dmHref={session && !mine ? `/messages/new?to=${l.seller.id}&listing=${listingId}` : undefined}
        />
      )}
    </div>
  );
}
