"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// 捲到接近底部就自動載入下一頁（用 replace，不會塞滿上一頁紀錄）；保留按鈕給不支援或想手動的人。
export function AutoPager({ href }: { href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          setLoading(true);
          router.replace(href, { scroll: false });
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [href, router]);
  return (
    <div className="mt-6 text-center">
      <Link ref={ref} href={href} replace scroll={false} className="btn" onClick={() => setLoading(true)}>
        {loading ? (
          <>
            <span className="spinner text-accent" aria-hidden />
            載入中…
          </>
        ) : (
          "載入更多"
        )}
      </Link>
    </div>
  );
}
