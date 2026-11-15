"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function Submit({ children, className = "btn btn-primary", disabled, name, value }: { children: ReactNode; className?: string; disabled?: boolean; name?: string; value?: string }) {
  const { pending, data } = useFormStatus();
  // 同一表單有兩個送出鈕（例如「發布」與「存成草稿」）時，只讓被按的那個轉圈
  const mine = pending && (name ? data?.get(name) === value : !data?.has("intent"));
  return (
    <button className={className} disabled={pending || disabled} name={name} value={value} aria-busy={pending || undefined}>
      {mine ? (
        <>
          <span className="spinner" aria-hidden />
          處理中…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormError({ state }: { state: { ok: boolean; error?: string } | null | undefined }) {
  if (!state || state.ok || !state.error) return null;
  return (
    <p role="alert" className="notice notice-danger">
      {state.error}
    </p>
  );
}
