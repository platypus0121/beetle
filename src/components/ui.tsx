import Link from "next/link";
import type { ReactNode } from "react";
import { mediaUrl } from "@/lib/format";
import { AutoPager } from "./AutoPager";

export function Avatar({ path, name, size = 36 }: { path?: string | null; name: string; size?: number }) {
  const url = mediaUrl(path, "avatars");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-wash object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-wash font-medium text-accent"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function UserLink({
  user,
  size = 24,
  className = "",
}: {
  user: { id: string; username: string; avatar_path?: string | null };
  size?: number;
  className?: string;
}) {
  return (
    <Link href={`/u/${user.id}`} className={`inline-flex items-center gap-1.5 hover:underline ${className}`}>
      <Avatar path={user.avatar_path} name={user.username} size={size} />
      <span className="truncate">{user.username}</span>
    </Link>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <svg viewBox="0 0 48 48" className="mx-auto mb-3 size-12 text-line" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <ellipse cx="24" cy="28" rx="10" ry="13" />
        <path d="M24 15v26M17 17l-5-6M31 17l5-6M14 26H8M34 26h6M15 35l-5 4M33 35l5 4" />
        <circle cx="24" cy="12" r="4" />
      </svg>
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-sub">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="mt-1 text-sm text-sub">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Tabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <div className="-mx-4 mb-4 flex overflow-x-auto border-b border-line px-4 [scrollbar-width:none]">
      {items.map((t) => (
        <Link key={t.key} href={t.href} className={`tab ${current === t.key ? "tab-active" : ""}`} scroll={false}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value} 星`}>
      {"★".repeat(Math.round(value))}
      <span className="text-line">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

export function SpeciesName({ s }: { s: { common_name: string; scientific_name: string } | null }) {
  if (!s) return null;
  return (
    <span>
      {s.common_name} <span className="sci text-sub">{s.scientific_name}</span>
    </span>
  );
}

export function Pager({ href, hasMore }: { href: string; hasMore: boolean }) {
  if (!hasMore) return null;
  return <AutoPager key={href} href={href} />;
}
