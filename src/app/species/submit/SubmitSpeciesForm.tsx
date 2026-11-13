"use client";
import { useActionState } from "react";
import Link from "next/link";
import { FAMILY_GROUPS } from "@/lib/constants";
import { FormError, Submit } from "@/components/Submit";
import { submitSpecies } from "../actions";

export function SubmitSpeciesForm() {
  const [state, action] = useActionState(submitSpecies, null);
  if (state?.ok)
    return (
      <div className="notice">
        已送出，審核結果會以通知告知。
        <Link href="/species" className="ml-2 text-accent underline">
          回物種列表
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <div>
        <label className="label" htmlFor="common_name">
          俗名（中文）
        </label>
        <input id="common_name" name="common_name" required maxLength={40} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="scientific_name">
          學名
        </label>
        <input id="scientific_name" name="scientific_name" required maxLength={80} placeholder="Dynastes hercules lichyi" className="input" autoCapitalize="off" />
      </div>
      <div>
        <label className="label" htmlFor="japanese_name">
          日文名（選填）
        </label>
        <input id="japanese_name" name="japanese_name" maxLength={40} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="family_group">
          分類
        </label>
        <select id="family_group" name="family_group" className="input" required>
          {Object.entries(FAMILY_GROUPS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="note">
          補充說明（選填）
        </label>
        <textarea id="note" name="note" rows={3} maxLength={500} className="input" />
      </div>
      <Submit className="btn btn-primary w-full">送出提報</Submit>
    </form>
  );
}
