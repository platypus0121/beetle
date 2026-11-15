"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Toast = { id: number; text: string; tone: "ok" | "error" };
const EVENT = "beetle:toast";
let seq = 0;

/** 在任何 client 元件裡呼叫，畫面底部會浮出提示。 */
export function toast(text: string, tone: Toast["tone"] = "ok") {
  window.dispatchEvent(new CustomEvent<Toast>(EVENT, { detail: { id: ++seq, text, tone } }));
}

function readFlash(): string | null {
  const m = document.cookie.match(/(?:^|; )flash=([^;]*)/);
  if (!m) return null;
  document.cookie = "flash=; path=/; max-age=0; samesite=lax";
  try {
    return decodeURIComponent(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  const path = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      setItems((list) => [...list.slice(-2), t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.tone === "error" ? 4000 : 2500);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  // 換頁（包含 Server Action redirect）後檢查有沒有伺服器留下的提示
  useEffect(() => {
    const text = readFlash();
    if (text) toast(text);
  }, [path, search]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={`max-w-sm rounded-full px-4 py-2.5 text-sm font-medium shadow-lg ${t.tone === "error" ? "bg-danger text-white" : "bg-ink text-white"}`}
          style={{ animation: "toast-in .2s ease-out" }}
        >
          {t.tone === "ok" && <span aria-hidden className="mr-1.5 text-[#7fd1a8]">✓</span>}
          {t.text}
        </div>
      ))}
    </div>
  );
}
