import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, isMod } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS, ORDER_STEPS, SHIPPING } from "@/lib/constants";
import { formatDateTime, price } from "@/lib/format";
import { signedStreamToken } from "@/lib/cloudflare-stream";
import { RichText } from "@/components/RichText";
import { StreamPlayer } from "@/components/StreamPlayer";
import { ReportButton } from "@/components/ReportButton";
import { Stars, UserLink } from "@/components/ui";
import { ActionButton, OrderMessageForm, PaymentInfoForm, ReasonAction, ReportPaymentForm, ShipForm } from "./OrderForms";

export const metadata: Metadata = { title: "交易單", robots: { index: false } };

const EVENT_LABEL: Record<string, string> = {
  create: "買家下單",
  auction_won: "拍賣結標成立交易",
  set_payment_info: "賣家更新收款資訊",
  accept: "賣家接受訂單",
  decline: "賣家婉拒訂單",
  cancel: "取消交易",
  auto_cancel: "系統自動取消",
  report_payment: "買家回報付款",
  confirm_payment: "賣家確認收款",
  reject_payment: "賣家表示未收到款項",
  report_unpaid: "賣家回報買家未付款",
  pay_overdue: "付款期限已過",
  ship: "賣家出貨",
  confirm_receipt: "買家確認收貨",
  auto_complete: "系統自動完成",
  open_dispute: "提出申訴",
  resolve: "站方裁決",
  evidence_deleted: "開箱影片已依規定刪除",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id) || 0;
  const session = await requireSession(`/orders/${orderId}`);
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("*, listing:listings(id, title, shipping_methods, stage), buyer:profiles!orders_buyer_id_fkey(id, username, avatar_path, credit_score, completed_orders, strikes, created_at), seller:profiles!orders_seller_id_fkey(id, username, avatar_path, credit_score, completed_orders, created_at)")
    .eq("id", orderId)
    .maybeSingle();
  if (!o || !o.buyer || !o.seller) notFound();
  const isBuyer = session.userId === o.buyer_id;
  const isSeller = session.userId === o.seller_id;
  const mod = isMod(session.profile);
  const other = isBuyer ? o.seller : o.buyer;

  const [{ data: info }, { data: reports }, { data: events }, { data: messages }, { data: dispute }, { data: reviews }, { data: saved }, acctNew] = await Promise.all([
    supabase.from("order_payment_info").select("*").eq("order_id", orderId).maybeSingle(),
    supabase.from("payment_reports").select("*").eq("order_id", orderId).order("id", { ascending: false }),
    supabase.from("order_events").select("*, actor:profiles(username)").eq("order_id", orderId).order("id"),
    supabase.from("order_messages").select("id, body, created_at, sender_id, sender:profiles(username)").eq("order_id", orderId).order("id"),
    supabase.from("disputes").select("*, video:video_uploads(stream_uid, status)").eq("order_id", orderId).order("id", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("reviews").select("*").eq("order_id", orderId),
    isSeller ? supabase.from("seller_payout_accounts").select("id, bank_code, account_no, account_name").eq("user_id", session.userId) : Promise.resolve({ data: [] }),
    isBuyer ? supabase.rpc("payment_account_is_new", { p_order: orderId }) : Promise.resolve({ data: false }),
  ]);
  const lastReport = reports?.[0];
  let screenshotUrl: string | null = null;
  if (lastReport?.screenshot_path) {
    screenshotUrl = (await supabase.storage.from("private").createSignedUrl(lastReport.screenshot_path, 600)).data?.signedUrl ?? null;
  }
  const videoToken = dispute?.video?.stream_uid && dispute.video.status !== "deleted" ? await signedStreamToken(dispute.video.stream_uid) : null;

  const step = ORDER_STEPS.indexOf((o.status === "payment_reported" ? "awaiting_payment" : o.status) as (typeof ORDER_STEPS)[number]);
  const myReview = reviews?.find((r) => r.reviewer_id === session.userId);
  const otherAge = Math.floor((Date.now() - new Date(other.created_at).getTime()) / 86400_000);
  const sellerRisky = isBuyer && (otherAge < 14 || o.seller.completed_orders === 0 || o.seller.credit_score < 90);
  const meetup = info?.method === "meetup";
  const overdue = o.pay_by && new Date(o.pay_by) < new Date();
  const canDispute = ["payment_reported", "paid", "shipped"].includes(o.status);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <div className="flex items-center justify-between gap-2">
          <h1 className="page-title">交易單 #{o.id}</h1>
          <span className={`chip ${o.status === "disputed" ? "chip-danger" : o.status === "cancelled" ? "" : "chip-accent"}`}>{ORDER_STATUS[o.status as keyof typeof ORDER_STATUS]}</span>
        </div>
        <p className="mt-1 text-sm">
          {o.listing ? (
            <Link href={`/market/${o.listing.id}`} className="text-accent underline">
              {o.listing.title}
            </Link>
          ) : (
            "（商品已刪除）"
          )}
        </p>
        <p className="mt-1 text-sm text-sub">
          <strong className="text-lg text-ink">{price(o.amount)}</strong>　{o.source === "auction" ? "拍賣得標" : "直購"}
          {o.shipping_method && `・${SHIPPING[o.shipping_method as keyof typeof SHIPPING]}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-sub">
          <span className="inline-flex items-center gap-1.5">
            買家 <UserLink user={o.buyer} size={20} className="text-ink" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            賣家 <UserLink user={o.seller} size={20} className="text-ink" />
          </span>
        </div>
        {o.buyer_note && <p className="mt-2 text-sm text-sub">買家備註：{o.buyer_note}</p>}
      </header>

      {/* 進度條 */}
      {step >= 0 && (
        <ol className="grid grid-cols-4 text-center text-xs" aria-label="交易進度">
          {ORDER_STEPS.map((s, i) => (
            <li key={s} className={i <= step ? "text-accent" : "text-faint"}>
              <div className="relative mb-1 flex items-center justify-center">
                {i > 0 && <span className={`absolute right-1/2 left-[-50%] top-1/2 h-0.5 ${i <= step ? "bg-accent" : "bg-line"}`} />}
                <span className={`relative z-10 flex size-6 items-center justify-center rounded-full text-[11px] font-medium ${i <= step ? "bg-accent text-white" : "bg-line text-sub"}`}>
                  {i < step || o.status === "completed" ? "✓" : i + 1}
                </span>
              </div>
              {ORDER_STATUS[s]}
            </li>
          ))}
        </ol>
      )}

      {/* 防詐騙提醒 */}
      {!["completed", "cancelled"].includes(o.status) && (
        <p className="notice notice-warn text-[13px]">
          <strong>付款資訊只看這張交易單。</strong>不要依照私訊、LINE 或其他管道提供的帳號匯款；本站不會要求你操作 ATM 或提供驗證碼。
        </p>
      )}

      {/* 下一步 */}
      <section className="card space-y-3 p-4" aria-label="下一步">
        {o.status === "requested" && isSeller && (
          <>
            <h2 className="font-semibold">買家想購買，請先提供收款資訊再接受</h2>
            <PaymentInfoForm orderId={o.id} saved={saved ?? []} current={info ?? null} allowMeetup={!!o.listing?.shipping_methods.includes("meetup")} />
            {info && <ActionButton orderId={o.id} action="accept" label="接受訂單" />}
            <ActionButton orderId={o.id} action="decline" label="婉拒" className="btn w-full" confirm="確定婉拒這筆訂單？" />
          </>
        )}
        {o.status === "requested" && isBuyer && (
          <>
            <p className="text-sm">已送出，等待賣家確認。賣家接受後會在這裡提供收款資訊。</p>
            <ReasonAction orderId={o.id} action="cancel" label="取消訂單" placeholder="取消原因（選填）" />
          </>
        )}

        {o.status === "awaiting_payment" && isBuyer && (
          <>
            <h2 className="font-semibold">請付款並回報</h2>
            <p className={`text-sm ${overdue ? "text-danger" : "text-sub"}`}>付款期限：{o.pay_by ? formatDateTime(o.pay_by) : "—"}{overdue && "（已逾期）"}</p>
            {info ? (
              <>
                <PaymentInfoView info={info} />
                {acctNew.data && <p className="notice notice-danger text-[13px]">這個收款帳戶和賣家過去完成交易時使用的不同，付款前請先在下方留言向賣家確認。</p>}
                {sellerRisky && (
                  <p className="notice notice-warn text-[13px]">
                    提醒：賣家{otherAge < 14 ? `註冊僅 ${otherAge} 天` : ""}
                    {o.seller.completed_orders === 0 ? "、尚無完成的交易" : ""}
                    {o.seller.credit_score < 90 ? `、信用分 ${o.seller.credit_score}` : ""}。金額較高時建議面交或分批交易。
                  </p>
                )}
                <ReportPaymentForm orderId={o.id} amount={o.amount} method={info.method} />
              </>
            ) : (
              <p className="notice">賣家尚未提供收款資訊，提供後你會收到通知。</p>
            )}
            <ReasonAction orderId={o.id} action="cancel" label="取消交易" placeholder="取消原因" warn="成立交易後取消會記棄標一次並扣信用分 10 分。" />
          </>
        )}
        {o.status === "awaiting_payment" && isSeller && (
          <>
            <h2 className="font-semibold">{info ? "等待買家付款" : "請提供收款資訊"}</h2>
            <p className={`text-sm ${overdue ? "text-danger" : "text-sub"}`}>付款期限：{o.pay_by ? formatDateTime(o.pay_by) : "—"}</p>
            <PaymentInfoForm orderId={o.id} saved={saved ?? []} current={info ?? null} allowMeetup />
            {overdue && <ActionButton orderId={o.id} action="report_unpaid" label="回報買家未付款並取消交易" className="btn btn-danger w-full" confirm="確定回報買家未付款？交易會取消，買家將被記棄標。" />}
            <ReasonAction orderId={o.id} action="cancel" label="取消交易" placeholder="取消原因" warn="成立交易後由賣家取消會扣信用分 5 分。" />
          </>
        )}

        {o.status === "payment_reported" && lastReport && (
          <>
            <h2 className="font-semibold">{isSeller ? "買家已回報付款，請確認是否入帳" : "已回報付款，等待賣家確認"}</h2>
            <PaymentReportView r={lastReport} screenshotUrl={screenshotUrl} />
            {isSeller && (
              <>
                <ActionButton orderId={o.id} action="confirm_payment" label="確認已收到款項" confirm="確認款項已入帳？確認後請盡快出貨。" />
                <ReasonAction orderId={o.id} action="reject_payment" label="尚未收到款項" placeholder="說明（例如：帳戶沒有這筆入帳）" />
              </>
            )}
          </>
        )}

        {o.status === "paid" && (isSeller ? (
          <>
            <h2 className="font-semibold">已確認收款，請出貨</h2>
            <ShipForm orderId={o.id} meetup={meetup} />
          </>
        ) : (
          <p className="text-sm">賣家已確認收款，等待出貨。</p>
        ))}

        {o.status === "shipped" && (
          <>
            <h2 className="font-semibold">{isBuyer ? "賣家已出貨" : "已出貨，等待買家確認收貨"}</h2>
            {o.tracking_no && <p className="text-sm">物流單號：<span className="font-mono">{o.tracking_no}</span></p>}
            {o.auto_complete_at && <p className="text-sm text-sub">{formatDateTime(o.auto_complete_at)} 前未確認也未申訴，系統會自動完成交易。</p>}
            {isBuyer && (
              <>
                <p className="notice text-[13px]">收件時請從未拆封開始錄影、一刀未剪拍到確認個體狀況。確認沒問題再按下方按鈕。</p>
                <ActionButton orderId={o.id} action="confirm_receipt" label="確認收貨，完成交易" confirm="確認收到且沒有問題？完成後無法再提出到貨死亡申訴。" />
                <Link href={`/orders/${o.id}/doa`} className="btn btn-danger w-full">
                  到貨死亡申訴（需開箱影片）
                </Link>
              </>
            )}
          </>
        )}

        {o.status === "disputed" && dispute && (
          <>
            <h2 className="font-semibold text-danger">{dispute.kind === "doa" ? "到貨死亡申訴處理中" : "交易糾紛處理中"}</h2>
            <p className="text-sm text-sub">站方會查看時間軸、付款紀錄與雙方說明後裁決。請在下方留言補充資料。</p>
          </>
        )}

        {o.status === "completed" && (
          <>
            <h2 className="font-semibold">交易完成</h2>
            {myReview ? (
              <p className="text-sm text-sub">
                你的評價：<Stars value={myReview.rating} /> {myReview.body}
              </p>
            ) : (isBuyer || isSeller) ? (
              <Link href={`/orders/${o.id}/review`} className="btn btn-primary w-full">
                評價{isBuyer ? "賣家" : "買家"}
              </Link>
            ) : null}
            {reviews?.filter((r) => r.reviewer_id !== session.userId).map((r) => (
              <p key={r.id} className="text-sm text-sub">
                對方給你的評價：<Stars value={r.rating} /> {r.body}
              </p>
            ))}
          </>
        )}
        {o.status === "cancelled" && <p className="text-sm text-sub">這筆交易已取消。</p>}

        {canDispute && (isBuyer || isSeller) && (
          <Link href={`/orders/${o.id}/dispute`} className="block text-center text-sm text-sub underline">
            交易有問題？提出申訴
          </Link>
        )}
        {mod && !isBuyer && !isSeller && o.status === "disputed" && (
          <Link href={`/admin/disputes/${o.id}`} className="btn btn-primary w-full">
            前往裁決
          </Link>
        )}
      </section>

      {/* 收款資訊（付款後仍保留供查核） */}
      {info && o.status !== "awaiting_payment" && o.status !== "requested" && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">收款資訊</h2>
          <PaymentInfoView info={info} />
          {lastReport && o.status !== "payment_reported" && (
            <div className="mt-3">
              <PaymentReportView r={lastReport} screenshotUrl={screenshotUrl} />
            </div>
          )}
        </section>
      )}

      {dispute && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">{dispute.kind === "doa" ? "到貨死亡申訴" : "糾紛申訴"}</h2>
          <RichText text={dispute.description} className="text-sm" />
          {dispute.kind === "doa" && (
            <div className="mt-3">
              {videoToken ? <StreamPlayer uid={dispute.video!.stream_uid} token={videoToken} /> : <p className="text-sm text-sub">{dispute.video?.status === "deleted" ? "開箱影片已依規定於交易結束 90 天後刪除。" : "開箱影片處理中或無法播放。"}</p>}
            </div>
          )}
          {dispute.status === "resolved" && (
            <div className="notice mt-3">
              <strong>站方裁決：</strong>
              {dispute.outcome === "completed" ? "交易成立" : "交易取消"}
              {dispute.fault !== "none" && `（${dispute.fault === "buyer" ? "買方" : "賣方"}責任）`}
              {dispute.resolution_note && <RichText text={dispute.resolution_note} className="mt-1" />}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">留言</h2>
        <ul className="mb-3 space-y-2">
          {(messages ?? []).map((m) => (
            <li key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.sender_id === session.userId ? "ml-auto bg-accent-wash" : "bg-wash"}`}>
              <div className="mb-0.5 text-[11px] text-faint">
                {m.sender?.username}・{formatDateTime(m.created_at)}
              </div>
              <RichText text={m.body} />
            </li>
          ))}
        </ul>
        {(isBuyer || isSeller || mod) && <OrderMessageForm orderId={o.id} />}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">時間軸</h2>
        <p className="mb-2 text-xs text-sub">每一步由系統記錄時間與操作者，任何人都無法修改或刪除。</p>
        <ol className="space-y-0 border-l border-line pl-4">
          {(events ?? []).map((e) => {
            const d = (e.detail ?? {}) as Record<string, string | boolean | null>;
            return (
              <li key={e.id} className="relative pb-3 text-sm">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-white bg-accent" />
                <div className="font-medium">
                  {EVENT_LABEL[e.action] ?? e.action}
                  {e.amount != null && <span className="ml-1.5 text-accent">{price(e.amount)}</span>}
                </div>
                <div className="text-xs text-sub">
                  {formatDateTime(e.created_at)}・{e.actor?.username ?? "系統"}
                  {d.last5 && `・末五碼 ${d.last5}`}
                  {d.account_tail && `・帳號末四碼 ${d.account_tail}`}
                  {d.tracking_no && `・單號 ${d.tracking_no}`}
                  {d.reason && `・${d.reason}`}
                  {d.has_screenshot && "・附截圖"}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {(isBuyer || isSeller) && (
        <div className="text-right">
          <ReportButton type="order" id={o.id} label="檢舉這筆交易" reasons={["scam", "protected", "abuse", "other"]} />
        </div>
      )}
    </div>
  );
}

function PaymentInfoView({ info }: { info: { method: string; bank_code: string | null; account_no: string | null; account_name: string | null; meetup_place: string | null; meetup_time: string | null; updated_at: string } }) {
  return (
    <dl className="rounded-lg bg-wash px-3.5 py-3 text-sm">
      {info.method === "transfer" ? (
        <>
          <Row k="方式" v="銀行轉帳" />
          <Row k="銀行代碼" v={info.bank_code} mono />
          <Row k="帳號" v={info.account_no} mono />
          <Row k="戶名" v={info.account_name} />
        </>
      ) : (
        <>
          <Row k="方式" v="面交付款" />
          <Row k="地點" v={info.meetup_place} />
          {info.meetup_time && <Row k="時間" v={formatDateTime(info.meetup_time)} />}
        </>
      )}
      <div className="mt-1 text-[11px] text-faint">更新於 {formatDateTime(info.updated_at)}</div>
    </dl>
  );
}
function Row({ k, v, mono }: { k: string; v: string | null; mono?: boolean }) {
  return (
    <div className="flex gap-3 py-0.5">
      <dt className="w-16 shrink-0 text-sub">{k}</dt>
      <dd className={`select-all ${mono ? "font-mono tracking-wide" : ""}`}>{v}</dd>
    </div>
  );
}
function PaymentReportView({ r, screenshotUrl }: { r: { amount: number; paid_at: string; last5: string | null; method: string; created_at: string }; screenshotUrl: string | null }) {
  return (
    <dl className="rounded-lg bg-wash px-3.5 py-3 text-sm">
      <Row k="回報金額" v={price(r.amount)} />
      <Row k="付款時間" v={formatDateTime(r.paid_at)} />
      {r.last5 && <Row k="末五碼" v={r.last5} mono />}
      <div className="mt-1 text-[11px] text-faint">回報於 {formatDateTime(r.created_at)}</div>
      {screenshotUrl && (
        <a href={screenshotUrl} target="_blank" rel="noopener" className="mt-2 inline-block text-accent underline">
          查看轉帳截圖
        </a>
      )}
    </dl>
  );
}
