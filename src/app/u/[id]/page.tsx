import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, isBanned, isMod } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { coverOf, LISTING_SELECT, mediaFor, POST_SELECT } from "@/lib/queries";
import { formatDate, timeAgo } from "@/lib/format";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { PostCard, type PostCardData } from "@/components/PostCard";
import { ReportButton } from "@/components/ReportButton";
import { RichText } from "@/components/RichText";
import { BlockButton, FriendButton } from "@/components/SocialButtons";
import { ToggleButton } from "@/components/Toggles";
import { Avatar, Empty, Stars, Tabs } from "@/components/ui";
import { toggleFollow } from "@/app/social/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  return p ? { title: p.username, description: p.bio?.slice(0, 120) ?? `${p.username} 的個人頁`, alternates: { canonical: `/u/${p.id}` } } : { title: "會員" };
}

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const p = await load(id);
  if (!p) notFound();
  const tab = ["listings", "reviews", "specimens"].includes(sp.tab ?? "") ? sp.tab! : "posts";
  const session = await getSession();
  const me = session?.userId ?? null;
  const mine = me === p.id;
  const supabase = await createClient();

  const [rating, followers, following, followRes, friendRes, blockRes] = await Promise.all([
    supabase.from("profile_ratings").select("avg_rating, review_count").eq("user_id", p.id).maybeSingle(),
    supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", p.id),
    supabase.from("user_follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", p.id),
    me && !mine ? supabase.from("user_follows").select("followee_id").eq("follower_id", me).eq("followee_id", p.id).maybeSingle() : null,
    me && !mine ? supabase.from("friendships").select("id, requester_id, status").or(`and(requester_id.eq.${me},addressee_id.eq.${p.id}),and(requester_id.eq.${p.id},addressee_id.eq.${me})`).maybeSingle() : null,
    me && !mine ? supabase.from("blocks").select("blocked_id").eq("blocker_id", me).eq("blocked_id", p.id).maybeSingle() : null,
  ]);
  const f = friendRes?.data;
  const rel = !f ? "none" : f.status === "accepted" ? "friends" : f.requester_id === me ? "pending_out" : "pending_in";
  const blocked = !!blockRes?.data;

  let content: React.ReactNode;
  if (tab === "posts") {
    const { data } = await supabase.from("posts").select(POST_SELECT).eq("author_id", p.id).in("status", mine ? ["published", "draft", "hidden"] : ["published"]).order("created_at", { ascending: false }).limit(30);
    const list = (data ?? []) as unknown as PostCardData[];
    const media = await mediaFor("post", list.map((x) => x.id));
    content = list.length ? list.map((x) => <PostCard key={x.id} post={x} cover={coverOf(media.get(x.id))} />) : <Empty title="還沒有文章" />;
  } else if (tab === "listings") {
    const { data } = await supabase.from("listings").select(LISTING_SELECT).eq("seller_id", p.id).in("status", mine ? ["active", "reserved", "sold", "closed", "hidden"] : ["active", "reserved", "sold"]).order("created_at", { ascending: false }).limit(40);
    const list = (data ?? []) as unknown as ListingCardData[];
    const media = await mediaFor("listing", list.map((x) => x.id));
    content = list.length ? (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((x) => (
          <ListingCard key={x.id} l={x} cover={coverOf(media.get(x.id))} />
        ))}
      </div>
    ) : (
      <Empty title="還沒有商品" />
    );
  } else if (tab === "reviews") {
    const { data } = await supabase.from("reviews").select("id, rating, body, reviewee_role, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, username)").eq("reviewee_id", p.id).order("created_at", { ascending: false }).limit(50);
    content = data?.length ? (
      <ul className="divide-y divide-line">
        {data.map((r) => (
          <li key={r.id} className="py-3 text-sm">
            <div className="flex items-center gap-2">
              <Stars value={r.rating} />
              <span className="chip">{r.reviewee_role === "seller" ? "作為賣家" : "作為買家"}</span>
              <span className="ml-auto text-xs text-faint">{timeAgo(r.created_at)}</span>
            </div>
            {r.body && <p className="mt-1">{r.body}</p>}
            <p className="mt-0.5 text-xs text-sub">— {r.reviewer?.username}</p>
          </li>
        ))}
      </ul>
    ) : (
      <Empty title="還沒有評價" />
    );
  } else {
    const { data } = await supabase.from("specimens").select("id, label, stage, sex, species(common_name)").eq("owner_id", p.id).eq("visibility", "public").order("created_at", { ascending: false }).limit(50);
    content = data?.length ? (
      <ul className="divide-y divide-line">
        {data.map((s) => (
          <li key={s.id}>
            <Link href={`/breeding/${s.id}`} className="flex items-center justify-between py-3 text-sm hover:bg-wash">
              <span className="font-medium">{s.label}</span>
              <span className="text-sub">{s.species?.common_name}</span>
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <Empty title="沒有公開的飼育個體" />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start gap-4">
        <Avatar path={p.avatar_path} name={p.username} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{p.username}</h1>
          <p className="text-xs text-sub">
            {p.city && `${p.city}・`}
            {formatDate(p.created_at)} 加入
            {isMod(p) && <span className="chip chip-accent ml-2">{p.role === "admin" ? "管理員" : "版主"}</span>}
            {isBanned(p) && <span className="chip chip-danger ml-2">停權中</span>}
          </p>
          <p className="mt-1 text-sm text-sub">
            <strong className="text-ink">{followers.count ?? 0}</strong> 追蹤者・<strong className="text-ink">{following.count ?? 0}</strong> 追蹤中
          </p>
        </div>
      </div>
      {p.bio && <RichText text={p.bio} className="mt-3 text-sm" />}

      <dl className="mt-4 grid grid-cols-4 gap-2 rounded-xl border border-line py-3 text-center text-xs">
        <div>
          <dd className="text-lg font-semibold">{p.credit_score}</dd>
          <dt className="text-sub">信用分</dt>
        </div>
        <div>
          <dd className="text-lg font-semibold">{rating.data?.review_count ? rating.data.avg_rating : "—"}</dd>
          <dt className="text-sub">評價（{rating.data?.review_count ?? 0}）</dt>
        </div>
        <div>
          <dd className="text-lg font-semibold">{p.completed_orders}</dd>
          <dt className="text-sub">完成交易</dt>
        </div>
        <div>
          <dd className={`text-lg font-semibold ${p.strikes ? "text-danger" : ""}`}>{p.strikes}</dd>
          <dt className="text-sub">棄標</dt>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {mine ? (
          <Link href="/settings" className="btn btn-sm">
            編輯個人資料
          </Link>
        ) : me ? (
          blocked ? (
            <p className="text-sm text-sub">你已封鎖這位會員。</p>
          ) : (
            <>
              <ToggleButton on={!!followRes?.data} action={toggleFollow.bind(null, p.id)} labelOn="✓ 追蹤中" labelOff="＋ 追蹤" loggedIn />
              <FriendButton target={p.id} state={rel} requestId={f?.id} />
              <Link href={`/messages/new?to=${p.id}`} className="btn btn-sm">
                私訊
              </Link>
            </>
          )
        ) : (
          <Link href={`/login?next=/u/${p.id}`} className="btn btn-sm">
            登入後追蹤或私訊
          </Link>
        )}
        {me && !mine && (
          <div className="ml-auto flex items-center gap-3">
            <BlockButton target={p.id} blocked={blocked} />
            <ReportButton type="user" id={p.id} reasons={["spam", "scam", "abuse", "other"]} />
            {session && isMod(session.profile) && (
              <Link href={`/admin/users?id=${p.id}`} className="text-xs text-sub">
                管理
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-5">
        <Tabs
          current={tab}
          items={[
            { key: "posts", label: "文章", href: `/u/${p.id}` },
            { key: "listings", label: "賣場", href: `/u/${p.id}?tab=listings` },
            { key: "reviews", label: "評價", href: `/u/${p.id}?tab=reviews` },
            { key: "specimens", label: "飼育個體", href: `/u/${p.id}?tab=specimens` },
          ]}
        />
        {content}
      </div>
    </div>
  );
}
