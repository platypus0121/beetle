"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function Submit({ children, className = "btn btn-primary", disabled, name, value }: { children: ReactNode; className?: string; disabled?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending || disabled} name={name} value={value}>
      {pending ? "處理中…" : children}
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
