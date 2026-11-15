"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ImageUploader, type UploadedImage } from "@/components/ImageUploader";
import { PrivateImageField } from "@/components/PrivateImageField";
import { SpeciesPicker, type SpeciesOption } from "@/components/SpeciesPicker";
import { FormError, Submit } from "@/components/Submit";
import { CharCount, FieldError, SmartForm } from "@/components/SmartForm";
import { VideoField } from "@/components/VideoField";
import { CITIES, LIMITS, LIVE_STAGES, SEXES, SHIPPING, STAGES } from "@/lib/constants";
import { saveListing } from "./actions";

export type ListingInitial = {
  id?: number;
  sale_type: string;
  species: SpeciesOption | null;
  title: string;
  description: string;
  origin: string | null;
  origin_is_taiwan: boolean;
  generation: string | null;
  emerged_on: string | null;
  size_mm: number | null;
  sex: string;
  stage: string;
  price: number | null;
  shipping_methods: string[];
  city: string | null;
  breeding_proof_path: string | null;
  images: UploadedImage[];
  hasVideo: boolean;
};

export function ListingForm({ initial, videoEnabled, defaultCity }: { initial?: ListingInitial; videoEnabled: boolean; defaultCity?: string | null }) {
  const editing = !!initial?.id;
  const [state, action] = useActionState(saveListing, null);
  const [saleType, setSaleType] = useState(initial?.sale_type ?? "fixed");
  const [stage, setStage] = useState(initial?.stage ?? "adult");
  const [species, setSpecies] = useState<SpeciesOption | null>(initial?.species ?? null);
  const [tw, setTw] = useState(initial?.origin_is_taiwan ?? false);
  const [proof, setProof] = useState<string | null>(initial?.breeding_proof_path ?? null);
  const [kept, setKept] = useState<UploadedImage[]>(editing ? (initial?.images ?? []) : []);
  const [removed, setRemoved] = useState<number[]>([]);
  const supply = stage === "supply";
  const live = LIVE_STAGES.includes(stage);
  const needProof = tw && live;
  const blocked = !!species?.is_protected;
  const auction = saleType === "auction";

  return (
    <SmartForm action={action} state={state} draftKey={editing ? undefined : "listing"} className="space-y-5">
      {editing && <input type="hidden" name="id" value={initial!.id} />}
      <input type="hidden" name="kept_count" value={kept.length} />
      {removed.map((id) => (
        <input key={id} type="hidden" name="removed_media" value={id} />
      ))}
      <FormError state={state} />

      {editing ? (
        <input type="hidden" name="sale_type" value={saleType} />
      ) : (
        <div>
          <span className="label">賣法</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["fixed", "直購", "固定價格，買家下單"],
              ["auction", "拍賣", "設定起標價，價高者得"],
            ].map(([k, t, d]) => (
              <label key={k} className="cursor-pointer">
                <input type="radio" name="sale_type" value={k} checked={saleType === k} onChange={() => setSaleType(k)} className="peer sr-only" />
                <span className="block rounded-lg border border-line px-3 py-2.5 peer-checked:border-accent peer-checked:bg-accent-wash">
                  <span className="block text-sm font-medium">{t}</span>
                  <span className="block text-xs text-sub">{d}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label" htmlFor="stage">
          類型
        </label>
        <select id="stage" name="stage" className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
          {Object.entries(STAGES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div data-field="species_id">
        <span className="label">物種{supply && "（用品可不填）"}</span>
        <SpeciesPicker initial={species} onSelect={setSpecies} />
        <FieldError name="species_id" />
        {blocked && (
          <p role="alert" className="notice notice-danger mt-2">
            「{species!.common_name}」是保育類野生動物，依《野生動物保育法》不得買賣，本站無法上架（含活體、標本與卵）。
          </p>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor="title">
            標題
          </label>
          <CharCount htmlFor="title" max={80} />
        </div>
        <input id="title" name="title" required minLength={2} maxLength={80} defaultValue={initial?.title} placeholder="例：DHH 長戟大兜蟲 ♂145mm CBF2" className="input" />
        <FieldError name="title" />
      </div>

      {!supply && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sex">
              性別
            </label>
            <select id="sex" name="sex" className="input" defaultValue={initial?.sex ?? "unknown"}>
              {Object.entries(SEXES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="size_mm">
              尺寸（mm）
            </label>
            <input id="size_mm" name="size_mm" type="number" inputMode="decimal" step="0.1" min="1" max="249" defaultValue={initial?.size_mm ?? ""} className="input" />
            <FieldError name="size_mm" />
          </div>
          <div>
            <label className="label" htmlFor="generation">
              累代
            </label>
            <input id="generation" name="generation" maxLength={20} defaultValue={initial?.generation ?? ""} placeholder="WD / WF1 / CBF2" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="emerged_on">
              羽化日
            </label>
            <input id="emerged_on" name="emerged_on" type="date" defaultValue={initial?.emerged_on ?? ""} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="origin">
              產地
            </label>
            <input id="origin" name="origin" maxLength={60} defaultValue={initial?.origin ?? ""} placeholder="例：Guadeloupe／印尼蘇門答臘／南投埔里" className="input" />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="origin_is_taiwan" checked={tw} onChange={(e) => setTw(e.target.checked)} className="size-4 accent-accent" />
              這是台灣產（台灣原生種或台灣採集個體的後代）
            </label>
          </div>
        </div>
      )}

      {needProof && (
        <div className="rounded-lg border border-warn/30 bg-warn-wash p-3">
          <p className="mb-2 text-sm text-warn">台灣產活體需附飼育證明（例如累代繁殖紀錄、親蟲與幼蟲照片、購買憑證），僅你和站方看得到。</p>
          <PrivateImageField name="breeding_proof_path" label="飼育證明" prefix="proof" initialPath={proof} onChange={setProof} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className={auction ? "" : "col-span-2"}>
          <label className="label" htmlFor="price">
            {auction ? "起標價" : "價格"}（NT$）
          </label>
          <input id="price" name="price" type="number" inputMode="numeric" required min="1" max="10000000" step="1" defaultValue={initial?.price ?? ""} className="input" />
          <FieldError name="price" />
        </div>
        {auction && !editing && (
          <>
            <div>
              <label className="label" htmlFor="min_increment">
                每次最低加價
              </label>
              <input id="min_increment" name="min_increment" type="number" inputMode="numeric" required min="1" step="1" defaultValue={50} className="input" />
              <FieldError name="min_increment" />
            </div>
            <div>
              <label className="label" htmlFor="auction_days">
                拍賣天數
              </label>
              <select id="auction_days" name="auction_days" className="input" defaultValue="3">
                {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                  <option key={d} value={d}>
                    {d} 天
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="buy_now_price">
                直購價（選填）
              </label>
              <input id="buy_now_price" name="buy_now_price" type="number" inputMode="numeric" min="1" step="1" className="input" />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="reserve_price">
                底價（選填，不公開）
              </label>
              <input id="reserve_price" name="reserve_price" type="number" inputMode="numeric" min="1" step="1" className="input" />
              <p className="hint">最高出價未達底價時流標。結標前 5 分鐘內有人出價會自動延長 5 分鐘。有人出價後就不能修改或刪除。</p>
            </div>
          </>
        )}
      </div>

      <div data-field="shipping_methods">
        <span className="label">寄送方式</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SHIPPING).map(([k, v]) => (
            <label key={k} className="cursor-pointer">
              <input type="checkbox" name="shipping_methods" value={k} defaultChecked={initial?.shipping_methods.includes(k)} className="peer sr-only" />
              <span className="inline-flex min-h-9 items-center rounded-full border border-line px-3.5 text-sm peer-checked:border-accent peer-checked:bg-accent-wash peer-checked:text-accent">
                {v}
              </span>
            </label>
          ))}
        </div>
        {live && <p className="hint">活體建議選擇隔日到的方式，並避開假日前寄出。</p>}
        <FieldError name="shipping_methods" />
      </div>

      <div>
        <label className="label" htmlFor="city">
          所在縣市
        </label>
        <select id="city" name="city" className="input" defaultValue={initial?.city ?? defaultCity ?? ""}>
          <option value="">不顯示</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="description">
          說明
        </label>
        <textarea id="description" name="description" rows={5} maxLength={5000} defaultValue={initial?.description} placeholder="個體狀況、瑕疵、飼育環境、可否面交…" className="input field-sizing-content min-h-32" />
        <FieldError name="description" />
      </div>

      <div>
        <span className="label">照片</span>
        {kept.length > 0 && (
          <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {kept.map((i) => (
              <div key={i.id} className="relative aspect-square overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="移除照片"
                  className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                  onClick={() => {
                    setKept(kept.filter((k) => k.id !== i.id));
                    setRemoved([...removed, i.id]);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <ImageUploader max={LIMITS.listingImages - kept.length} />
      </div>

      {!initial?.hasVideo && (
        <div>
          <span className="label">影片（選填，1 支）</span>
          <VideoField enabled={videoEnabled} />
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agreed" required className="mt-1 size-4 accent-accent" />
        <span>
          我已閱讀
          <Link href="/market/guide" target="_blank" className="text-accent underline">
            交易注意事項
          </Link>
          ，確認商品不是保育類、來源合法，並同意付款與出貨一律記錄在站內交易單。
        </span>
      </label>

      <Submit className="btn btn-primary w-full" disabled={blocked || (needProof && !proof)}>
        {editing ? "儲存" : auction ? "開始拍賣" : "上架"}
      </Submit>
      {needProof && !proof && <p className="text-center text-xs text-warn">請先上傳飼育證明</p>}
    </SmartForm>
  );
}
