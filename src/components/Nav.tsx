import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/constants";
import { Avatar } from "./ui";
import { BackButton, BottomNav, TopLinks } from "./NavLinks";

export async function Nav() {
  const session = await getSession();
  let unread = { notifications: 0, messages: 0 };
  if (session) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unread_counts");
    if (data && typeof data === "object") unread = data as typeof unread;
  }
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 max-[359px]:gap-2">
          <BackButton />
          <Link href="/" className="flex min-w-0 items-center gap-2 text-[17px] font-semibold tracking-tight text-ink max-[359px]:gap-1.5 max-[359px]:text-[15px]">
            <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full bg-accent max-[359px]:hidden" />
            <span className="truncate">{SITE_NAME}</span>
          </Link>
          <TopLinks />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link href="/search" aria-label="搜尋" className="btn btn-ghost btn-sm px-2">
              <Icon d="M21 21l-4.3-4.3M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </Link>
            {session ? (
              <>
                <Link href="/messages" aria-label="私訊" className="btn btn-ghost btn-sm relative px-2">
                  <Icon d="M4 5h16v11H8l-4 4V5z" />
                  <Dot n={unread.messages} />
                </Link>
                <Link href="/notifications" aria-label="通知" className="btn btn-ghost btn-sm relative px-2">
                  <Icon d="M6 16V10a6 6 0 1112 0v6l2 2H4l2-2zM10 20h4" />
                  <Dot n={unread.notifications} />
                </Link>
                <Link href="/me" aria-label="我的" className="ml-1 hidden sm:block">
                  <Avatar path={session.profile.avatar_path} name={session.profile.username} size={32} />
                </Link>
              </>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm">
                登入
              </Link>
            )}
          </div>
        </div>
      </header>
      <BottomNav loggedIn={!!session} />
    </>
  );
}

function Dot({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute top-0.5 right-0 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 font-medium text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function Icon({ d, className = "size-[22px]" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}
