import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { coverOf, mediaFor, POST_SELECT } from "@/lib/queries";
import { POST_CATEGORIES, SITE_DESC } from "@/lib/constants";
import { PostCard, type PostCardData } from "@/components/PostCard";
import { Empty, Pager, Tabs } from "@/components/ui";

const PAGE = 20;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; cat?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const tab = sp.tab === "hot" || (sp.tab === "following" && session) ? sp.tab : "new";
  const cat = sp.cat && sp.cat in POST_CATEGORIES ? sp.cat : null;
  const page = Math.min(Math.max(Number(sp.page) || 1, 1), 25);
  const supabase = await createClient();

  let query = supabase.from("posts").select(POST_SELECT).eq("status", "published");
  if (cat) query = query.eq("category", cat as "share");
  let emptyFollowing = false;
  if (tab === "following" && session) {
    const [{ data: users }, { data: species }] = await Promise.all([
      supabase.from("user_follows").select("followee_id").eq("follower_id", session.userId),
      supabase.from("species_follows").select("species_id").eq("user_id", session.userId),
    ]);
    const parts: string[] = [];
    if (users?.length) parts.push(`author_id.in.(${users.map((u) => u.followee_id).join(",")})`);
    if (species?.length) parts.push(`species_id.in.(${species.map((s) => s.species_id).join(",")})`);
    if (parts.length) query = query.or(parts.join(","));
    else emptyFollowing = true;
  }
  if (tab === "hot") {
    query = query
      .gte("created_at", new Date(Date.now() - 14 * 86400_000).toISOString())
      .order("like_count", { ascending: false })
      .order("comment_count", { ascending: false });
  }
  const { data } = emptyFollowing
    ? { data: [] }
    : await query.order("created_at", { ascending: false }).range(0, page * PAGE);
  const posts = (data ?? []) as unknown as PostCardData[];
  const shown = posts.slice(0, page * PAGE);
  const media = await mediaFor("post", shown.map((p) => p.id));

  const qs = (o: Record<string, string | null>) => {
    const u = new URLSearchParams();
    const merged = { tab: tab === "new" ? null : tab, cat, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="mx-auto max-w-2xl">
      {!session && (
        <div className="mb-5 rounded-xl bg-accent-wash px-4 py-4">
          <p className="font-semibold text-accent">鍬形蟲・兜蟲・金龜的同好社群</p>
          <p className="mt-1 text-sm text-sub">{SITE_DESC}</p>
          <Link href="/login" className="btn btn-primary btn-sm mt-3">
            加入
          </Link>
        </div>
      )}
      <Tabs
        current={tab}
        items={[
          { key: "new", label: "最新", href: qs({ tab: null, page: null }) },
          { key: "hot", label: "熱門", href: qs({ tab: "hot", page: null }) },
          ...(session ? [{ key: "following", label: "追蹤中", href: qs({ tab: "following", page: null }) }] : []),
        ]}
      />
      <div className="-mx-4 mb-1 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        <Link href={qs({ cat: null, page: null })} className={`chip min-h-8 px-3 ${!cat ? "chip-accent" : ""}`}>
          全部
        </Link>
        {Object.entries(POST_CATEGORIES).map(([k, label]) => (
          <Link key={k} href={qs({ cat: k, page: null })} className={`chip min-h-8 px-3 ${cat === k ? "chip-accent" : ""}`}>
            {label}
          </Link>
        ))}
      </div>
      {shown.length === 0 ? (
        <Empty
          title={tab === "following" ? "還沒有追蹤的內容" : "還沒有文章"}
          hint={tab === "following" ? "到物種頁或會員頁按「追蹤」，新文章會出現在這裡" : "成為第一個分享的人"}
          action={
            <Link href={tab === "following" ? "/species" : "/posts/new"} className="btn btn-primary btn-sm">
              {tab === "following" ? "逛逛物種" : "發表文章"}
            </Link>
          }
        />
      ) : (
        shown.map((p) => <PostCard key={p.id} post={p} cover={coverOf(media.get(p.id))} />)
      )}
      <Pager href={qs({ page: String(page + 1) })} hasMore={posts.length > page * PAGE} />
    </div>
  );
}
