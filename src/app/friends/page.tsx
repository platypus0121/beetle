import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FriendButton } from "@/components/SocialButtons";
import { Avatar, Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "好友", robots: { index: false } };

export default async function FriendsPage() {
  const { userId } = await requireSession("/friends");
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select("id, status, requester_id, requester:profiles!friendships_requester_id_fkey(id, username, avatar_path), addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_path)")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []).map((f) => ({ ...f, other: f.requester_id === userId ? f.addressee : f.requester })).filter((f) => f.other);
  const incoming = rows.filter((f) => f.status === "pending" && f.requester_id !== userId);
  const outgoing = rows.filter((f) => f.status === "pending" && f.requester_id === userId);
  const friends = rows.filter((f) => f.status === "accepted");
  const Row = ({ f, state }: { f: (typeof rows)[number]; state: "pending_in" | "pending_out" | "friends" }) => (
    <li className="flex items-center gap-3 py-2.5">
      <Link href={`/u/${f.other!.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar path={f.other!.avatar_path} name={f.other!.username} size={40} />
        <span className="truncate font-medium">{f.other!.username}</span>
      </Link>
      {state === "friends" && (
        <Link href={`/messages/new?to=${f.other!.id}`} className="btn btn-sm">
          私訊
        </Link>
      )}
      <FriendButton target={f.other!.id} state={state} requestId={f.id} />
    </li>
  );
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="好友" sub="到會員的個人頁按「加好友」送出邀請。" />
      {incoming.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-1 text-sm font-semibold text-sub">收到的邀請（{incoming.length}）</h2>
          <ul className="divide-y divide-line">
            {incoming.map((f) => (
              <Row key={f.id} f={f} state="pending_in" />
            ))}
          </ul>
        </section>
      )}
      <section className="mb-5">
        <h2 className="mb-1 text-sm font-semibold text-sub">好友（{friends.length}）</h2>
        {friends.length ? (
          <ul className="divide-y divide-line">
            {friends.map((f) => (
              <Row key={f.id} f={f} state="friends" />
            ))}
          </ul>
        ) : (
          <Empty title="還沒有好友" hint="和交易過或聊得來的同好加個好友吧" />
        )}
      </section>
      {outgoing.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-sub">已送出的邀請</h2>
          <ul className="divide-y divide-line">
            {outgoing.map((f) => (
              <Row key={f.id} f={f} state="pending_out" />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
