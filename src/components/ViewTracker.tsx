"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// 每次換頁送一筆瀏覽紀錄（只送路徑，不含網址參數）
export function ViewTracker() {
  const path = usePathname();
  useEffect(() => {
    if (/^\/(admin|api)(\/|$)/.test(path)) return;
    fetch("/api/view", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }), keepalive: true }).catch(() => {});
  }, [path]);
  return null;
}
