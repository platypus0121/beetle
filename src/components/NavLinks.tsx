"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "討論", match: /^\/($|posts)/ },
  { href: "/market", label: "交易", match: /^\/(market|orders)/ },
  { href: "/species", label: "物種", match: /^\/species/ },
  { href: "/breeding", label: "飼育紀錄", match: /^\/breeding/ },
  { href: "/shops", label: "甲蟲店", match: /^\/shops/ },
];

export function TopLinks() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-md px-2.5 py-1.5 text-sm ${l.match.test(path) ? "bg-accent-wash font-medium text-accent" : "text-sub hover:text-ink"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const ICONS = {
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4v-9z",
  market: "M4 7h16l-1.5 12h-13L4 7zM8 7a4 4 0 018 0",
  plus: "M12 5v14M5 12h14",
  species: "M12 3v18M6 7c0 4 2 6 6 6s6-2 6-6M5 20c1-3 3-5 7-5s6 2 7 5",
  me: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.5-4 4.5-5.5 8-5.5s6.5 1.5 8 5.5",
};

export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname();
  if (/^\/(messages\/\d+|login|welcome)/.test(path)) return null;
  const items = [
    { href: "/", label: "討論", icon: ICONS.home, active: /^\/($|posts\/\d)/.test(path) },
    { href: "/market", label: "交易", icon: ICONS.market, active: /^\/(market|orders)/.test(path) },
    { href: "/new", label: "發布", icon: ICONS.plus, primary: true, active: false },
    { href: "/species", label: "物種", icon: ICONS.species, active: /^\/species/.test(path) },
    { href: loggedIn ? "/me" : "/login", label: loggedIn ? "我的" : "登入", icon: ICONS.me, active: /^\/(me|settings|breeding|friends)/.test(path) },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${it.active ? "text-accent" : "text-sub"}`}
            >
              {it.primary ? (
                <span className="flex size-10 items-center justify-center rounded-full bg-accent text-white">
                  <Svg d={it.icon} />
                </span>
              ) : (
                <>
                  <Svg d={it.icon} />
                  {it.label}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Svg({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[22px]" aria-hidden>
      <path d={d} />
    </svg>
  );
}
