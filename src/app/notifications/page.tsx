import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";
import { markNotifications } from "@/app/social/actions";

export const metadata: Metadata = { title: "通知", robots: { index: false } };

export default async function NotificationsPage() {
  const { userId } = await requireSession("/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).neq("type", "message").order("id", { ascending: false }).limit(100);
  const unread = (data ?? []).some((n) => !n.read_at);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="通知"
        action={
          <div className="flex items-center gap-2">
            {unread && (
              <form action={markNotifications}>
                <button className="btn btn-sm">全部已讀</button>
              </form>
            )}
            <Link href="/settings" className="text-xs text-sub">
              通知設定
            </Link>
          </div>
        }
      />
      {!data?.length ? (
        <Empty title="沒有通知" />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((n) => (
            <li key={n.id} className={`relative py-3 pl-4 ${n.read_at ? "" : "bg-accent-wash/50"}`}>
              {!n.read_at && <span className="absolute top-5 left-1 size-1.5 rounded-full bg-accent" />}
              <form action={markNotifications}>
                <input type="hidden" name="id" value={n.id} />
                {n.link && /^\/[^/]/.test(n.link) ? (
                  <Link href={n.link} className="block text-sm font-medium">
                    {n.title}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{n.title}</p>
                )}
                {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-sub">{n.body}</p>}
                <p className="mt-0.5 flex items-center gap-3 text-xs text-faint">
                  {timeAgo(n.created_at)}
                  {!n.read_at && <button className="relative z-10 underline">標為已讀</button>}
                </p>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
