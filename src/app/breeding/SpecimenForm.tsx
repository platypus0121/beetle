"use client";
import { SmartForm } from "@/components/SmartForm";
import { useActionState, useState } from "react";
import { ImageUploader, type UploadedImage } from "@/components/ImageUploader";
import { SpeciesPicker, type SpeciesOption } from "@/components/SpeciesPicker";
import { FormError, Submit } from "@/components/Submit";
import { LIMITS, SPECIMEN_STAGES } from "@/lib/constants";
import { saveSpecimen } from "./actions";

export type SpecimenInitial = {
  id: number;
  label: string;
  species: SpeciesOption | null;
  stage: string;
  sex: string;
  bloodline_name: string | null;
  sire_id: number | null;
  dam_id: number | null;
  origin: string | null;
  generation: string | null;
  hatched_on: string | null;
  emerged_on: string | null;
  died_on: string | null;
  final_size_mm: number | null;
  notes: string | null;
  visibility: string;
  images: UploadedImage[];
};

export function SpecimenForm({ initial, parents }: { initial?: SpecimenInitial; parents: { id: number; label: string; sex: string }[] }) {
  const [state, action] = useActionState(saveSpecimen, null);
  const [kept, setKept] = useState<UploadedImage[]>(initial?.images ?? []);
  const [removed, setRemoved] = useState<number[]>([]);
  const candidates = parents.filter((p) => p.id !== initial?.id);
  return (
    <SmartForm action={action} state={state} draftKey={initial ? undefined : "specimen"} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="kept_count" value={kept.length} />
      {removed.map((id) => (
        <input key={id} type="hidden" name="removed_media" value={id} />
      ))}
      <FormError state={state} />
      <div>
        <label className="label" htmlFor="label">
          個體名稱／編號
        </label>
        <input id="label" name="label" required maxLength={40} defaultValue={initial?.label} placeholder="例：DHH-2026-03" className="input" />
      </div>
      <div>
        <span className="label">物種</span>
        <SpeciesPicker initial={initial?.species ?? null} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="stage">
            階段
          </label>
          <select id="stage" name="stage" className="input" defaultValue={initial?.stage ?? "larva"}>
            {Object.entries(SPECIMEN_STAGES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sex">
            性別
          </label>
          <select id="sex" name="sex" className="input" defaultValue={initial?.sex ?? "unknown"}>
            <option value="male">♂ 公</option>
            <option value="female">♀ 母</option>
            <option value="unknown">不明</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="generation">
            累代
          </label>
          <input id="generation" name="generation" maxLength={20} defaultValue={initial?.generation ?? ""} placeholder="CBF2" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="origin">
            產地
          </label>
          <input id="origin" name="origin" maxLength={60} defaultValue={initial?.origin ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="hatched_on">
            孵化日
          </label>
          <input id="hatched_on" name="hatched_on" type="date" defaultValue={initial?.hatched_on ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="emerged_on">
            羽化日
          </label>
          <input id="emerged_on" name="emerged_on" type="date" defaultValue={initial?.emerged_on ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="final_size_mm">
            成蟲尺寸（mm）
          </label>
          <input id="final_size_mm" name="final_size_mm" type="number" step="0.1" inputMode="decimal" defaultValue={initial?.final_size_mm ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="died_on">
            死亡日
          </label>
          <input id="died_on" name="died_on" type="date" defaultValue={initial?.died_on ?? ""} className="input" />
        </div>
      </div>
      <fieldset className="rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-medium">血統</legend>
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="bloodline_name">
              血統名稱
            </label>
            <input id="bloodline_name" name="bloodline_name" maxLength={60} defaultValue={initial?.bloodline_name ?? ""} placeholder="例：能勢 YG、久留米" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["sire_id", "父本 ♂", initial?.sire_id, "female"],
                ["dam_id", "母本 ♀", initial?.dam_id, "male"],
              ] as const
            ).map(([name, label, value, exclude]) => (
              <div key={name}>
                <label className="label" htmlFor={name}>
                  {label}
                </label>
                <select id={name} name={name} className="input" defaultValue={value ?? ""}>
                  <option value="">未記錄</option>
                  {candidates
                    .filter((p) => p.sex !== exclude)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>
          <p className="hint">父母本從你自己的飼育個體中選擇；先建立親蟲，再建立子代。</p>
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="notes">
          備註
        </label>
        <textarea id="notes" name="notes" rows={3} maxLength={3000} defaultValue={initial?.notes ?? ""} className="input" />
      </div>
      <div>
        <span className="label">照片</span>
        {kept.length > 0 && (
          <div className="mb-2 grid grid-cols-4 gap-2">
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
        <ImageUploader max={LIMITS.specimenImages - kept.length} />
      </div>
      <div>
        <span className="label">誰看得到</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["private", "只有我", "預設"],
            ["public", "公開", "顯示在個人頁與物種頁"],
          ].map(([k, t, d]) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="visibility" value={k} defaultChecked={(initial?.visibility ?? "private") === k} className="peer sr-only" />
              <span className="block rounded-lg border border-line px-3 py-2 peer-checked:border-accent peer-checked:bg-accent-wash">
                <span className="block text-sm font-medium">{t}</span>
                <span className="block text-xs text-sub">{d}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <Submit className="btn btn-primary w-full">{initial ? "儲存" : "建立個體"}</Submit>
    </SmartForm>
  );
}
