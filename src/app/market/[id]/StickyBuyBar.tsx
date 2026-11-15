"use client";
import Link from "next/link";
import { useEffect } from "react";

// 手機版商品頁固定在底部的購買列：價格一直看得到，主要按鈕一按就捲到下單／出價表單。
// 出現時會暫時藏起全站底部導覽（body[data-sticky-cta]），避免兩條疊在一起。
export function StickyBuyBar({
  priceText,
  sub,
  label,
  href,
  dmHref,
}: {
  priceText: string;
  sub?: string;
  label: string;
  href?: string;
  dmHref?: string;
}) {
  useEffect(() => {
    document.body.dataset.stickyCta = "1";
    return () => {
      delete document.body.dataset.stickyCta;
    };
  }, []);

  const toPanel = () => {
    const panel = document.getElementById("buy");
    if (!panel) return;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    const field = panel.querySelector<HTMLElement>("#amount, #shipping");
    setTimeout(() => field?.focus({ preventScroll: true }), 400);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg leading-tight font-semibold text-accent">{priceText}</div>
          {sub && <div className="truncate text-xs text-sub">{sub}</div>}
        </div>
        {dmHref && (
          <Link href={dmHref} className="btn px-3" aria-label="私訊賣家">
            私訊
          </Link>
        )}
        {href ? (
          <Link href={href} className="btn btn-primary min-w-28">
            {label}
          </Link>
        ) : (
          <button type="button" onClick={toPanel} className="btn btn-primary min-w-28">
            {label}
          </button>
        )}
      </div>
    </div>
  );
}
