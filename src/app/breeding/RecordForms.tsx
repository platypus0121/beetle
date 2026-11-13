"use client";
import { useActionState, useEffect, useRef } from "react";
import { FormError, Submit } from "@/components/Submit";
import { EVENT_TYPES } from "@/lib/constants";
import { addRecord, addTemperature } from "./actions";

const today = () => {
  const d = new Date(Date.now() + 8 * 3600_000);
  return d.toISOString().slice(0, 10);
};

function useResetOnOk(state: { ok: boolean } | null) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function RecordForm({ specimenId, kind }: { specimenId: number; kind: "measurement" | "bottle" | "event" }) {
  const [state, action] = useActionState(addRecord, null);
  const ref = useResetOnOk(state);
  return (
    <details className="rounded-lg border border-line">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-accent">
        ＋ {kind === "measurement" ? "新增量測" : kind === "bottle" ? "新增換瓶" : "新增事件"}
      </summary>
      <form ref={ref} action={action} className="grid grid-cols-2 gap-2.5 border-t border-line p-3">
        <input type="hidden" name="specimen_id" value={specimenId} />
        <input type="hidden" name="kind" value={kind} />
        <div className="col-span-2">
          <FormError state={state} />
        </div>
        <label className="col-span-2 text-xs text-sub">
          日期
          <input name="on" type="date" required defaultValue={today()} className="input mt-1" suppressHydrationWarning />
        </label>
        {kind === "measurement" && (
          <>
            <label className="text-xs text-sub">
              體重（g）
              <input name="weight_g" type="number" step="0.01" inputMode="decimal" className="input mt-1" />
            </label>
            <label className="text-xs text-sub">
              頭幅（mm）
              <input name="head_width_mm" type="number" step="0.01" inputMode="decimal" className="input mt-1" />
            </label>
          </>
        )}
        {kind === "bottle" && (
          <>
            <label className="text-xs text-sub">
              菌瓶／木屑種類
              <input name="substrate" maxLength={60} placeholder="例：雲芝菌瓶、發酵木屑" className="input mt-1" />
            </label>
            <label className="text-xs text-sub">
              容量（ml）
              <input name="volume_ml" type="number" inputMode="numeric" className="input mt-1" />
            </label>
            <label className="col-span-2 text-xs text-sub">
              下次預定換瓶日（到期會通知）
              <input name="next_due_on" type="date" className="input mt-1" />
            </label>
          </>
        )}
        {kind === "event" && (
          <label className="col-span-2 text-xs text-sub">
            事件
            <select name="event_type" className="input mt-1">
              {Object.entries(EVENT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        <input name="note" maxLength={300} placeholder="備註（選填）" aria-label="備註" className="input col-span-2" />
        <Submit className="btn btn-primary col-span-2">儲存</Submit>
      </form>
    </details>
  );
}

export function TemperatureForm({ specimens }: { specimens: { id: number; label: string }[] }) {
  const [state, action] = useActionState(addTemperature, null);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="card grid grid-cols-2 gap-2.5 p-3">
      <div className="col-span-2">
        <FormError state={state} />
      </div>
      <label className="text-xs text-sub">
        日期
        <input name="on" type="date" required defaultValue={today()} className="input mt-1" suppressHydrationWarning />
      </label>
      <label className="text-xs text-sub">
        溫度（°C）
        <input name="temp_c" type="number" step="0.1" inputMode="decimal" required className="input mt-1" />
      </label>
      <label className="text-xs text-sub">
        濕度（%，選填）
        <input name="humidity" type="number" inputMode="numeric" min="0" max="100" className="input mt-1" />
      </label>
      <label className="text-xs text-sub">
        位置（選填）
        <input name="location" maxLength={40} placeholder="例：酒櫃、蟲室" className="input mt-1" />
      </label>
      <label className="col-span-2 text-xs text-sub">
        對應個體（選填）
        <select name="specimen_id" className="input mt-1">
          <option value="">整個飼育環境</option>
          {specimens.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <Submit className="btn btn-primary col-span-2">記錄</Submit>
    </form>
  );
}
