import Link from "next/link";
import type { ReactNode } from "react";

// 使用者內容一律當純文字輸出（React 會自動跳脫），只把網址與 @暱稱 轉成連結。
// 不使用 dangerouslySetInnerHTML，所以沒有 XSS 的入口。
const TOKEN = /(https?:\/\/[^\s<>"']+)|(@[^\s@/\\<>]{2,20})/g;

function safeHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    if (m[1]) {
      const trimmed = m[1].replace(/[)，。、！？.,!?]+$/, "");
      const href = safeHref(trimmed);
      out.push(
        href ? (
          <a key={i++} href={href} target="_blank" rel="nofollow ugc noopener noreferrer" className="break-all text-accent underline">
            {trimmed}
          </a>
        ) : (
          trimmed
        ),
      );
      if (trimmed.length < m[1].length) out.push(m[1].slice(trimmed.length));
    } else if (m[2]) {
      out.push(
        <Link key={i++} href={`/u/by/${encodeURIComponent(m[2].slice(1))}`} className="text-accent">
          {m[2]}
        </Link>,
      );
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <div className={`break-words whitespace-pre-wrap leading-relaxed ${className}`}>{out}</div>;
}
