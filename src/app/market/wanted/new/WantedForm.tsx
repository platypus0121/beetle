"use client";
import { SmartForm } from "@/components/SmartForm";
import { useActionState, useState } from "react";
import Link from "next/link";
import { SpeciesPicker, type SpeciesOption } from "@/components/SpeciesPicker";
import { FormError, Submit } from "@/components/Submit";
import { CITIES } from "@/lib/constants";
import { saveWanted } from "../../actions";

export function WantedForm({ defaultCity }: { defaultCity: string | null }) {
  const [state, action] = useActionState(saveWanted, null);
  const [species, setSpecies] = useState<SpeciesOption | null>(null);
  return (
    <SmartForm action={action} state={state} draftKey={"wanted"} className="space-y-4">
      <FormError state={state} />
      <div>
        <span className="label">品種（選填）</span>
        <SpeciesPicker onSelect={setSpecies} />
        {species?.is_protected && <p className="notice notice-danger mt-2">保育類野生動物依法不得買賣，無法刊登徵求。</p>}
      </div>
      <div>
        <label className="label" htmlFor="title">
          標題
        </label>
        <input id="title" name="title" required minLength={2} maxLength={80} placeholder="例：徵 巴拉望大扁 ♂ 95mm 以上" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="description">
          說明
        </label>
        <textarea id="description" name="description" rows={4} maxLength={2000} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="budget">
            預算（NT$，選填）
          </label>
          <input id="budget" name="budget" type="number" inputMode="numeric" min="1" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="city">
            所在縣市
          </label>
          <select id="city" name="city" className="input" defaultValue={defaultCity ?? ""}>
            <option value="">不顯示</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agreed" required className="mt-1 size-4 accent-accent" />
        <span>
          我已閱讀
          <Link href="/market/guide" target="_blank" className="text-accent underline">
            交易注意事項
          </Link>
        </span>
      </label>
      <Submit className="btn btn-primary w-full" disabled={!!species?.is_protected}>
        刊登
      </Submit>
    </SmartForm>
  );
}
