"use client";
import { useActionState, useState } from "react";
import { createReport } from "@/app/reports/actions";
import { REPORT_REASONS } from "@/lib/constants";
import { Submit } from "./Submit";

export function ReportButton({
  type,
  id,
  label = "檢舉",
  reasons,
  className = "text-xs text-faint hover:text-danger",
}: {
  type: string;
  id: string | number;
  label?: string;
  reasons?: (keyof typeof REPORT_REASONS)[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createReport, null);
  const list = reasons ?? (["spam", "scam", "protected", "abuse", "other"] as const);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 text-left text-base text-ink sm:rounded-2xl">
            {state?.ok ? (
              <>
                <p className="font-medium">已收到，謝謝你的回報</p>
                <p className="mt-1 text-sm text-sub">站方會盡快查看。</p>
                <button type="button" className="btn mt-4 w-full" onClick={() => setOpen(false)}>
                  關閉
                </button>
              </>
            ) : (
              <form action={action} className="space-y-3">
                <p className="font-semibold">{label}</p>
                <input type="hidden" name="target_type" value={type} />
                <input type="hidden" name="target_id" value={id} />
                {state && !state.ok && <p className="notice notice-danger">{state.error}</p>}
                <div className="space-y-1">
                  {list.map((r, i) => (
                    <label key={r} className="flex min-h-10 items-center gap-2 text-sm">
                      <input type="radio" name="reason" value={r} defaultChecked={i === 0} className="size-4 accent-accent" />
                      {REPORT_REASONS[r]}
                    </label>
                  ))}
                </div>
                <textarea name="detail" rows={3} maxLength={1000} placeholder="補充說明（選填）" className="input" />
                <div className="flex gap-2">
                  <button type="button" className="btn flex-1" onClick={() => setOpen(false)}>
                    取消
                  </button>
                  <Submit className="btn btn-primary flex-1">送出</Submit>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
