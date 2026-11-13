import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { Avatar, Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "私訊", robots: { index: false } };

export default async function MessagesPage() {
  const { userId } = await requireSession("/messages");
  const supabase = await createClient();
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, last_message_at, last_message_preview, a:profiles!conversations_user_a_fkey(id, username, avatar_path), b:profiles!conversations_user_b_fkey(id, username, avatar_path)")
    .order("last_message_at", { ascending: false })
    .limit(100);
  const ids = (convs ?? []).map((c) => c.id);
  const { data: unread } = ids.length
    ? await supabase.from("messages").select("conversation_id").in("conversation_id", ids).neq("sender_id", userId).is("read_at", null).limit(1000)
    : { data: [] };
  const counts = new Map<number, number>();
  for (const m of unread ?? []) counts.set(m.conversation_id, (counts.get(m.conversation_id) ?? 0) + 1);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="私訊" />
      <p className="notice notice-warn mb-3 text-[13px]">付款資訊請一律放在交易單。任何人在私訊要你匯款到指定帳號，都請拒絕並檢舉。</p>
      {!convs?.length ? (
        <Empty title="還沒有對話" hint="到會員個人頁或商品頁按「私訊」開始聊" />
      ) : (
        <ul className="divide-y divide-line">
          {convs.map((c) => {
            const other = c.a?.id === userId ? c.b : c.a;
            if (!other) return null;
            const n = counts.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-3 py-3 hover:bg-wash">
                  <Avatar path={other.avatar_path} name={other.username} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${n ? "font-semibold" : "font-medium"}`}>{other.username}</span>
                      <span className="shrink-0 text-xs text-faint">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className={`truncate text-sm ${n ? "text-ink" : "text-sub"}`}>{c.last_message_preview ?? ""}</p>
                  </div>
                  {n > 0 && <span className="rounded-full bg-danger px-1.5 text-[11px] leading-5 text-white">{n}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
