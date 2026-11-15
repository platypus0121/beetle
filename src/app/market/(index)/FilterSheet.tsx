"use client";
import { useEffect, useRef, type ReactNode } from "react";

// 手機上從底部滑出的篩選面板；欄位仍屬於外層的 <Form>，按「套用」就是送出那個表單。
export function FilterSheet({ count, children }: { count: number; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  // 套用後是站內換頁，元件不會卸載，要自己關起來
  useEffect(() => {
    const form = ref.current?.closest("form");
    const close = () => ref.current?.close();
    form?.addEventListener("submit", close);
    return () => form?.removeEventListener("submit", close);
  }, []);
  return (
    <>
      <button type="button" className={`btn shrink-0 px-3 ${count ? "border-accent/40 bg-accent-wash text-accent" : ""}`} onClick={() => ref.current?.showModal()}>
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        篩選{count > 0 && <span className="tabular-nums">（{count}）</span>}
      </button>
      <dialog
        ref={ref}
        className="sheet"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-semibold">篩選商品</h2>
            <button type="button" aria-label="關閉" className="btn btn-ghost btn-sm px-2 text-xl" onClick={() => ref.current?.close()}>
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 overflow-y-auto p-4">{children}</div>
        </div>
      </dialog>
    </>
  );
}

export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
