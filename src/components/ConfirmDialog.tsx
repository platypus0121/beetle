"use client";
import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";

type Ask = { message: string; confirmLabel?: string; danger?: boolean };

/**
 * 取代瀏覽器原生 confirm()：手機上從底部滑出、桌面置中。
 * 用法：const [dialog, guard] = useConfirm(); <form onSubmit={guard({ message })}>…{dialog}</form>
 * guard 會先擋下送出，使用者按「確定」後再以同一個按鈕重新送出表單。
 */
export function useConfirm(): [ReactNode, (opts: Ask | null | ((e: FormEvent<HTMLFormElement>) => Ask | null)) => (e: FormEvent<HTMLFormElement>) => void] {
  const ref = useRef<HTMLDialogElement>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const passing = useRef(false);

  const close = (ok: boolean) => {
    ref.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
  };

  const guard = useCallback(
    (opts: Ask | null | ((e: FormEvent<HTMLFormElement>) => Ask | null)) => (e: FormEvent<HTMLFormElement>) => {
      if (passing.current) return;
      const o = typeof opts === "function" ? opts(e) : opts;
      if (!o) return;
      e.preventDefault();
      const form = e.currentTarget;
      const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
      setAsk(o);
      ref.current?.showModal();
      resolver.current = (ok) => {
        if (!ok) return;
        passing.current = true;
        form.requestSubmit(submitter && form.contains(submitter) ? submitter : undefined);
        passing.current = false;
      };
    },
    [],
  );

  const dialog = (
    <dialog
      ref={ref}
      className="sheet"
      onClose={() => resolver.current?.(false)}
      onClick={(e) => {
        if (e.target === ref.current) close(false); // 點背景關閉
      }}
    >
      <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <p className="text-[15px] leading-relaxed">{ask?.message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={() => close(false)} autoFocus>
            取消
          </button>
          <button type="button" className={ask?.danger === false ? "btn btn-primary" : "btn border-danger bg-danger text-white hover:bg-danger/90"} onClick={() => close(true)}>
            {ask?.confirmLabel ?? "確定"}
          </button>
        </div>
      </div>
    </dialog>
  );
  return [dialog, guard];
}
