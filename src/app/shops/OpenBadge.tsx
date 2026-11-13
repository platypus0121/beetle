"use client";
import { useEffect, useState } from "react";

type Hours = Record<string, string[][]> | null;
const KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// 以台灣時間判斷現在是否營業中。時間隨時在變，所以在瀏覽器端計算。
export function OpenBadge({ hours }: { hours: Hours }) {
  const [state, setState] = useState<"open" | "closed" | null>(null);
  useEffect(() => {
    if (!hours) return;
    const calc = () => {
      const now = new Date(Date.now() + 8 * 3600_000);
      const hm = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
      const spans = hours[KEYS[now.getUTCDay()]] ?? [];
      setState(spans.some(([a, b]) => hm >= a && hm < b) ? "open" : "closed");
    };
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, [hours]);
  if (!hours) return <span className="chip">營業時間請洽店家</span>;
  if (!state) return null;
  return <span className={`chip ${state === "open" ? "chip-accent" : ""}`}>{state === "open" ? "● 營業中" : "休息中"}</span>;
}
