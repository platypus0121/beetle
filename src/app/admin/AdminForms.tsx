"use client";
import { useActionState } from "react";
import { FormError, Submit } from "@/components/Submit";
import { CITIES, FAMILY_GROUPS } from "@/lib/constants";
import { banUser, handleReport, resolveDispute, saveShop, saveSpecies, setHidden, setRole, wordAction } from "./actions";

export function ReportActions({ id, type, targetId }: { id: number; type: string; targetId: string }) {
  const [state, action] = useActionState(handleReport, null);
  const hideable = ["post", "comment", "listing", "wanted"].includes(type);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="target_type" value={type} />
      <input type="hidden" name="target_id" value={targetId} />
      <FormError state={state} />
      <input name="note" maxLength={300} placeholder="處理說明（會通知內容的作者）" aria-label="處理說明" className="input" />
      <div className="flex flex-wrap gap-2">
        {hideable && <Submit className="btn btn-danger btn-sm" name="intent" value="hide">隱藏內容並結案</Submit>}
        <Submit className="btn btn-sm" name="intent" value="resolve">已處理</Submit>
        <Submit className="btn btn-sm" name="intent" value="dismiss">不成立</Submit>
      </div>
    </form>
  );
}

export function HiddenToggle({ type, id, hidden }: { type: string; id: number; hidden: boolean }) {
  const [state, action] = useActionState(setHidden, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <FormError state={state} />
      {state?.ok && <p className="notice">已更新。</p>}
      {!hidden && <input name="note" maxLength={300} placeholder="隱藏原因（會通知作者）" aria-label="隱藏原因" className="input" />}
      <Submit className={hidden ? "btn btn-sm" : "btn btn-danger btn-sm"} name="intent" value={hidden ? "restore" : "hide"}>
        {hidden ? "還原" : "隱藏"}
      </Submit>
    </form>
  );
}

export function BanForm({ user, banned }: { user: string; banned: boolean }) {
  const [state, action] = useActionState(banUser, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="user" value={user} />
      <FormError state={state} />
      {state?.ok && <p className="notice">已更新。</p>}
      {banned ? (
        <Submit className="btn btn-sm" name="intent" value="unban">解除停權</Submit>
      ) : (
        <div className="flex flex-wrap gap-2">
          <select name="days" className="input w-28" aria-label="停權天數">
            {[1, 3, 7, 30, 365, 36500].map((d) => (
              <option key={d} value={d}>
                {d >= 36500 ? "永久" : `${d} 天`}
              </option>
            ))}
          </select>
          <input name="reason" required maxLength={300} placeholder="停權原因" aria-label="停權原因" className="input min-w-0 flex-1" />
          <Submit className="btn btn-danger btn-sm">停權</Submit>
        </div>
      )}
    </form>
  );
}

export function RoleForm({ user, role }: { user: string; role: string }) {
  const [state, action] = useActionState(setRole, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user" value={user} />
      <select name="role" defaultValue={role} className="input w-32" aria-label="角色">
        <option value="user">一般會員</option>
        <option value="moderator">版主</option>
        <option value="admin">管理員</option>
      </select>
      <Submit className="btn btn-sm">變更角色</Submit>
      {state && !state.ok && <span className="text-xs text-danger">{state.error}</span>}
      {state?.ok && <span className="text-xs text-accent">已更新</span>}
    </form>
  );
}

export function ResolveForm({ orderId }: { orderId: number }) {
  const [state, action] = useActionState(resolveDispute, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <h2 className="font-semibold">裁決</h2>
      <input type="hidden" name="order_id" value={orderId} />
      <FormError state={state} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-sub">
          結果
          <select name="outcome" className="input mt-1">
            <option value="cancelled">交易取消（買方勝訴）</option>
            <option value="completed">交易成立（賣方勝訴）</option>
          </select>
        </label>
        <label className="text-xs text-sub">
          責任歸屬（扣信用分 15）
          <select name="fault" className="input mt-1">
            <option value="none">不歸責</option>
            <option value="seller">賣方</option>
            <option value="buyer">買方</option>
          </select>
        </label>
      </div>
      <textarea name="note" required minLength={10} maxLength={2000} rows={4} placeholder="裁決理由（雙方都看得到，會寫入時間軸）" aria-label="裁決理由" className="input" />
      <Submit className="btn btn-primary w-full">送出裁決</Submit>
      <p className="text-xs text-sub">站方不經手款項：裁決只改變站內交易狀態與信用分，退款需由當事人自行處理。</p>
    </form>
  );
}

type SpeciesRow = { id: number; common_name: string; scientific_name: string; japanese_name: string | null; aliases: string; family_group: string; is_protected: boolean; is_native_tw: boolean };
export function SpeciesForm({ s }: { s?: SpeciesRow }) {
  const [state, action] = useActionState(saveSpecies, null);
  return (
    <form action={action} className="grid grid-cols-2 gap-2.5">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="col-span-2">
        <FormError state={state} />
        {state?.ok && <p className="notice">已儲存。</p>}
      </div>
      <input name="common_name" required defaultValue={s?.common_name} placeholder="俗名" aria-label="俗名" className="input" />
      <input name="scientific_name" required defaultValue={s?.scientific_name} placeholder="學名" aria-label="學名" className="input" />
      <input name="japanese_name" defaultValue={s?.japanese_name ?? ""} placeholder="日文名" aria-label="日文名" className="input" />
      <select name="family_group" defaultValue={s?.family_group ?? "stag"} className="input" aria-label="分類">
        {Object.entries(FAMILY_GROUPS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <input name="aliases" defaultValue={s?.aliases ?? ""} placeholder="別名（空白分隔，供搜尋）" aria-label="別名" className="input col-span-2" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_protected" defaultChecked={s?.is_protected} className="size-4 accent-accent" />
        保育類（禁止上架）
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_native_tw" defaultChecked={s?.is_native_tw} className="size-4 accent-accent" />
        台灣原生
      </label>
      <Submit className="btn btn-primary btn-sm col-span-2">{s ? "儲存" : "新增物種"}</Submit>
    </form>
  );
}

const DAY_LABEL = { mon: "一", tue: "二", wed: "三", thu: "四", fri: "五", sat: "六", sun: "日" } as const;
export type ShopRow = {
  id: number; name: string; city: string; district: string | null; address: string | null; phone: string | null;
  opening_hours: Record<string, string[][]> | null; hours_note: string | null; website: string | null; facebook: string | null;
  instagram: string | null; items: string | null; lat: number | null; lng: number | null; status: string; source_url: string | null; last_verified_on: string | null;
  boarding: boolean | null; boarding_note: string | null;
};
export function ShopForm({ shop }: { shop?: ShopRow }) {
  const [state, action] = useActionState(saveShop, null);
  const h = shop?.opening_hours;
  return (
    <form action={action} className="grid grid-cols-2 gap-2.5">
      {shop && <input type="hidden" name="id" value={shop.id} />}
      <div className="col-span-2">
        <FormError state={state} />
        {state?.ok && <p className="notice">已儲存。</p>}
      </div>
      <input name="name" required defaultValue={shop?.name} placeholder="店名" aria-label="店名" className="input col-span-2" />
      <select name="city" required defaultValue={shop?.city ?? ""} className="input" aria-label="縣市">
        <option value="" disabled>
          縣市
        </option>
        {CITIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input name="district" defaultValue={shop?.district ?? ""} placeholder="行政區" aria-label="行政區" className="input" />
      <input name="address" defaultValue={shop?.address ?? ""} placeholder="地址" aria-label="地址" className="input col-span-2" />
      <input name="phone" defaultValue={shop?.phone ?? ""} placeholder="電話" aria-label="電話" className="input" />
      <input name="items" defaultValue={shop?.items ?? ""} placeholder="主要品項" aria-label="主要品項" className="input" />
      <label className="col-span-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="hours_known" defaultChecked={!!h} className="size-4 accent-accent" />
        已查證營業時間（不勾＝顯示「請洽店家」）
      </label>
      {(Object.keys(DAY_LABEL) as (keyof typeof DAY_LABEL)[]).map((d) => (
        <label key={d} className="flex items-center gap-2 text-xs text-sub">
          週{DAY_LABEL[d]}
          <input name={`h_${d}`} defaultValue={(h?.[d] ?? []).map((x) => x.join("-")).join(", ")} placeholder="13:00-21:00（空白＝公休）" className="input" />
        </label>
      ))}
      <input name="hours_note" defaultValue={shop?.hours_note ?? ""} placeholder="營業時間備註（例：不定休，出發前請先確認粉專）" aria-label="營業時間備註" className="input col-span-2" />
      <input name="website" defaultValue={shop?.website ?? ""} placeholder="官網 https://" aria-label="官網" className="input col-span-2" />
      <input name="facebook" defaultValue={shop?.facebook ?? ""} placeholder="Facebook https://" aria-label="Facebook" className="input" />
      <input name="instagram" defaultValue={shop?.instagram ?? ""} placeholder="Instagram https://" aria-label="Instagram" className="input" />
      <input name="lat" defaultValue={shop?.lat ?? ""} placeholder="緯度" aria-label="緯度" inputMode="decimal" className="input" />
      <input name="lng" defaultValue={shop?.lng ?? ""} placeholder="經度" aria-label="經度" inputMode="decimal" className="input" />
      <input name="source_url" defaultValue={shop?.source_url ?? ""} placeholder="查證來源 https://" aria-label="查證來源" className="input" />
      <input name="last_verified_on" type="date" defaultValue={shop?.last_verified_on ?? ""} aria-label="查證日期" className="input" />
      <select name="status" defaultValue={shop?.status ?? "open"} className="input" aria-label="狀態">
        <option value="open">營業中（公開顯示）</option>
        <option value="closed">已歇業（不顯示）</option>
      </select>
      <select name="boarding" defaultValue={shop?.boarding == null ? "" : shop.boarding ? "yes" : "no"} className="input" aria-label="代客溫控寄養">
        <option value="">溫控寄養：尚未確認</option>
        <option value="yes">有提供代客溫控寄養</option>
        <option value="no">確認不提供寄養</option>
      </select>
      <input name="boarding_note" defaultValue={shop?.boarding_note ?? ""} maxLength={200} placeholder="寄養說明（例：限幼蟲、需預約、收費方式）" aria-label="寄養說明" className="input col-span-2" />
      <Submit className="btn btn-primary btn-sm">{shop ? "儲存" : "新增店家"}</Submit>
    </form>
  );
}

export function WordForm({ word }: { word?: string }) {
  const [state, action] = useActionState(wordAction, null);
  return word ? (
    <form action={action} className="inline">
      <input type="hidden" name="word" value={word} />
      <button name="intent" value="delete" className="chip min-h-8 px-3 hover:bg-danger-wash hover:text-danger" title="點擊移除">
        {word} ×
      </button>
    </form>
  ) : (
    <form action={action} className="flex gap-2">
      <input name="word" required minLength={2} maxLength={40} placeholder="新增禁用詞" aria-label="新增禁用詞" className="input" />
      <Submit className="btn">新增</Submit>
      {state && !state.ok && <span className="self-center text-xs text-danger">{state.error}</span>}
    </form>
  );
}
