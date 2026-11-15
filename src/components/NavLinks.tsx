"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  // 私訊對話、登入流程、各種編輯表單（底部有固定的送出鈕、鍵盤也會頂上來）不顯示底部導覽
  if (/^\/(messages\/\d+|login|welcome|new$|posts\/new|posts\/\d+\/edit|market\/new|market\/\d+\/edit|market\/wanted\/new|breeding\/new|breeding\/\d+\/edit|orders\/\d+\/(dispute|doa|review))/.test(path)) return null;
  const items = [
    { href: "/", label: "討論", icon: ICONS.home, active: /^\/($|posts\/\d)/.test(path) },
    { href: "/market", label: "交易", icon: ICONS.market, active: /^\/(market|orders)/.test(path) },
    { href: "/new", label: "發布", icon: ICONS.plus, primary: true, active: false },
    { href: "/species", label: "物種", icon: ICONS.species, active: /^\/species/.test(path) },
    { href: loggedIn ? "/me" : "/login", label: loggedIn ? "我的" : "登入", icon: ICONS.me, active: /^\/(me|settings|breeding|friends)/.test(path) },
  ];
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={(e) => {
                // 已經在這個分頁的首頁再點一次：捲回頂端
                if (it.href === path) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              aria-current={it.active ? "page" : undefined}
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

// 各分頁的首頁不需要返回鍵
const ROOTS = /^\/(market|species|me|breeding|shops|login|welcome|search|notifications|messages|friends|orders|new)?$/;
let navigatedInApp = false;

/** 手機標題列左側的「‹」：站內有上一頁就返回，直接打開網址的就回到上一層。 */
export function BackButton() {
  const path = usePathname();
  const router = useRouter();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else navigatedInApp = true;
  }, [path]);
  if (ROOTS.test(path)) return null;
  const up = path.replace(/\/[^/]+$/, "") || "/";
  const parent = /^\/(posts|u)$/.test(up) ? "/" : up === "/market/wanted" ? "/market?type=wanted" : up;
  return (
    <button
      type="button"
      aria-label="返回"
      onClick={() => (navigatedInApp ? router.back() : router.push(parent))}
      className="-ml-2 flex size-10 items-center justify-center rounded-full text-ink hover:bg-wash sm:hidden"
    >
      <Svg d="M15 5l-7 7 7 7" />
    </button>
  );
}
