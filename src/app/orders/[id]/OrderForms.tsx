"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toaster";
import { PrivateImageField } from "@/components/PrivateImageField";
import { FormError, Submit } from "@/components/Submit";
import { orderAction, sendOrderMessage, setPaymentInfo } from "../actions";

export function ActionButton({
  orderId,
  action,
  label,
  className = "btn btn-primary w-full",
  confirm: confirmText,
}: {
  orderId: number;
  action: string;
  label: string;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(orderAction, null);
  const [dialog, guard] = useConfirm();
  useEffect(() => {
    if (state?.ok) toast(`${label}：完成，對方會收到通知`);
  }, [state, label]);
  return (
    <form action={formAction} onSubmit={guard(confirmText ? { message: confirmText, confirmLabel: label, danger: /取消|未收到|未付款/.test(label) } : null)}>
      {dialog}
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="action" value={action} />
      <FormError state={state} />
      <Submit className={className}>{label}</Submit>
    </form>
  );
}

export function ReasonAction({ orderId, action, label, placeholder, warn }: { orderId: number; action: string; label: string; placeholder: string; warn?: string }) {
  const [state, formAction] = useActionState(orderAction, null);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-sub">{label}</summary>
      <form action={formAction} className="mt-2 space-y-2">
        <input type="hidden" name="order_id" value={orderId} />
        <input type="hidden" name="action" value={action} />
        <FormError state={state} />
        <input name="reason" maxLength={300} placeholder={placeholder} className="input" />
        {warn && <p className="text-xs text-warn">{warn}</p>}
        <Submit className="btn btn-danger btn-sm">確定{label}</Submit>
      </form>
    </details>
  );
}

type Payout = { id: number; bank_code: string; account_no: string; account_name: string };

export function PaymentInfoForm({
  orderId,
  saved,
  current,
  allowMeetup,
}: {
  orderId: number;
  saved: Payout[];
  current: { method: string; bank_code: string | null; account_no: string | null; account_name: string | null; meetup_place: string | null } | null;
  allowMeetup: boolean;
}) {
  const [state, action] = useActionState(setPaymentInfo, null);
  const [method, setMethod] = useState(current?.method ?? "transfer");
  const [v, setV] = useState({ bank: current?.bank_code ?? "", acct: current?.account_no ?? "", name: current?.account_name ?? "" });
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <FormError state={state} />
      {state?.ok && <p className="notice">收款資訊已更新，買家會收到通知。</p>}
      <div className="flex gap-2">
        {[
          ["transfer", "銀行轉帳"],
          ...(allowMeetup ? [["meetup", "面交付款"]] : []),
        ].map(([k, t]) => (
          <label key={k} className="flex-1 cursor-pointer">
            <input type="radio" name="method" value={k} checked={method === k} onChange={() => setMethod(k)} className="peer sr-only" />
            <span className="flex min-h-10 items-center justify-center rounded-lg border border-line text-sm peer-checked:border-accent peer-checked:bg-accent-wash peer-checked:text-accent">{t}</span>
          </label>
        ))}
      </div>
      {method === "transfer" ? (
        <>
          {saved.length > 0 && (
            <select
              className="input"
              aria-label="常用收款帳戶"
              defaultValue=""
              onChange={(e) => {
                const p = saved.find((s) => String(s.id) === e.target.value);
                if (p) setV({ bank: p.bank_code, acct: p.account_no, name: p.account_name });
              }}
            >
              <option value="">選擇常用帳戶…</option>
              {saved.map((s) => (
                <option key={s.id} value={s.id}>
                  ({s.bank_code}) …{s.account_no.slice(-5)} {s.account_name}
                </option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-[90px_1fr] gap-2">
            <input name="bank_code" inputMode="numeric" maxLength={3} required placeholder="代碼" aria-label="銀行代碼" className="input" value={v.bank} onChange={(e) => setV({ ...v, bank: e.target.value })} />
            <input name="account_no" inputMode="numeric" maxLength={20} required placeholder="帳號" aria-label="帳號" className="input" value={v.acct} onChange={(e) => setV({ ...v, acct: e.target.value })} />
          </div>
          <input name="account_name" maxLength={40} required placeholder="戶名" aria-label="戶名" className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-sub">
            <input type="checkbox" name="save" className="size-4 accent-accent" />
            存為常用收款帳戶
          </label>
        </>
      ) : (
        <>
          <input name="meetup_place" maxLength={200} required placeholder="面交地點（建議白天、公共場所）" aria-label="面交地點" defaultValue={current?.meetup_place ?? ""} className="input" />
          <input name="meetup_time" type="datetime-local" aria-label="面交時間" className="input" />
        </>
      )}
      <Submit className="btn btn-primary w-full">{current ? "更新收款資訊" : "送出收款資訊"}</Submit>
      <p className="text-xs text-sub">收款資訊只有這筆交易的買家和站方看得到，並會記錄在時間軸。</p>
    </form>
  );
}

export function ReportPaymentForm({ orderId, amount, method }: { orderId: number; amount: number; method: string }) {
  const [state, action] = useActionState(orderAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="action" value="report_payment" />
      <FormError state={state} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="amount">
            付款金額
          </label>
          <input id="amount" name="amount" type="number" inputMode="numeric" required min="1" defaultValue={amount} className="input" />
        </div>
        {method === "transfer" && (
          <div>
            <label className="label" htmlFor="last5">
              你的帳號末五碼
            </label>
            <input id="last5" name="last5" inputMode="numeric" maxLength={5} pattern="\d{5}" required className="input" />
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="paid_at">
          付款時間（不填視為現在）
        </label>
        <input id="paid_at" name="paid_at" type="datetime-local" className="input" />
      </div>
      {method === "transfer" && (
        <div>
          <span className="label">轉帳截圖（選填，建議附上）</span>
          <PrivateImageField name="screenshot_path" label="截圖" prefix="pay" />
        </div>
      )}
      <Submit className="btn btn-primary w-full">{method === "meetup" ? "回報已面交付款" : "回報已付款"}</Submit>
    </form>
  );
}

export function ShipForm({ orderId, meetup }: { orderId: number; meetup: boolean }) {
  const [state, action] = useActionState(orderAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="action" value="ship" />
      <FormError state={state} />
      {!meetup && <input name="tracking_no" maxLength={40} placeholder="物流單號（選填，建議填寫）" aria-label="物流單號" className="input" />}
      <Submit className="btn btn-primary w-full">{meetup ? "已當面交付" : "已出貨"}</Submit>
    </form>
  );
}

export function OrderMessageForm({ orderId }: { orderId: number }) {
  const [state, action] = useActionState(sendOrderMessage, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <div className="flex-1">
        <input name="body" required maxLength={1000} placeholder="在交易單留言（會列入紀錄）" aria-label="留言" className="input" />
        {state && !state.ok && <p className="mt-1 text-xs text-danger">{state.error}</p>}
      </div>
      <Submit className="btn">送出</Submit>
    </form>
  );
}
