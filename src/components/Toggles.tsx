"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/result";

// 按讚／收藏／追蹤這類開關按鈕：先樂觀更新畫面，失敗再還原。
export function ToggleButton({
  on,
  count,
  action,
  labelOn,
  labelOff,
  loggedIn,
  className = "btn btn-sm",
}: {
  on: boolean;
  count?: number;
  action: (currentlyOn: boolean) => Promise<ActionResult>;
  labelOn: string;
  labelOff: string;
  loggedIn: boolean;
  className?: string;
}) {
  const [state, setState] = useState({ on, count: count ?? 0 });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        aria-pressed={state.on}
        className={`${className} ${state.on ? "border-accent/40 bg-accent-wash text-accent" : ""}`}
        onClick={() => {
          if (!loggedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
          const prev = state;
          setError(null);
          setState({ on: !prev.on, count: prev.count + (prev.on ? -1 : 1) });
          start(async () => {
            const res = await action(prev.on);
            if (!res.ok) {
              setState(prev);
              setError(res.error);
            } else router.refresh();
          });
        }}
      >
        {state.on ? labelOn : labelOff}
        {count !== undefined && <span>{state.count}</span>}
      </button>
      {error && <span className="mt-1 text-xs text-danger">{error}</span>}
    </span>
  );
}
