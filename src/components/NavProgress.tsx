"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// 頂部細進度條：點了站內連結就開始跑，網址真的換了才收尾。
// 不靠套件——監聽整頁的連結點擊即可涵蓋所有 <Link>。
export function NavProgress() {
  const path = usePathname();
  const search = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const start = () => {
      if (started.current) return;
      started.current = true;
      setVisible(true);
      setWidth(8);
      timer.current = setInterval(() => setWidth((w) => (w < 85 ? w + (90 - w) * 0.08 : w)), 200);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!started.current) return;
    started.current = false;
    if (timer.current) clearInterval(timer.current);
    setWidth(100);
    const t = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
    return () => clearTimeout(t);
  }, [path, search]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5" style={{ opacity: visible ? 1 : 0, transition: "opacity .25s" }}>
      <div className="h-full bg-accent" style={{ width: `${width}%`, transition: "width .2s ease-out" }} />
    </div>
  );
}
