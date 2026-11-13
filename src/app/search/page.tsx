import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { coverOf, LISTING_SELECT, mediaFor, POST_SELECT } from "@/lib/queries";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { PostCard, type PostCardData } from "@/components/PostCard";
import { Avatar, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "搜尋", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 40);
  const t = q.replace(/[%_,()]/g, " ").trim();
  let results: React.ReactNode = null;
  if (t.length >= 1) {
    const supabase = await createClient();
    const [{ data: species }, { data: posts }, { data: listings }, { data: users }] = await Promise.all([
      supabase.from("species").select("id, common_name, scientific_name, japanese_name, is_protected").ilike("search_text", `%${t.toLowerCase()}%`).limit(8),
      supabase.from("posts").select(POST_SELECT).eq("status", "published").or(`title.ilike.%${t}%,body.ilike.%${t}%`).order("created_at", { ascending: false }).limit(15),
      supabase.from("listings").select(LISTING_SELECT).eq("status", "active").or(`title.ilike.%${t}%,scientific_name.ilike.%${t}%,origin.ilike.%${t}%`).order("created_at", { ascending: false }).limit(8),
      supabase.from("profiles").select("id, username, avatar_path").ilike("username", `%${t}%`).limit(6),
    ]);
    const pl = (posts ?? []) as unknown as PostCardData[];
    const ll = (listings ?? []) as unknown as ListingCardData[];
    const [pm, lm] = await Promise.all([mediaFor("post", pl.map((p) => p.id)), mediaFor("listing", ll.map((l) => l.id))]);
    const none = !species?.length && !pl.length && !ll.length && !users?.length;
    results = none ? (
      <p className="py-10 text-center text-sub">找不到「{q}」的相關內容</p>
    ) : (
      <div className="space-y-7">
        {!!species?.length && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-sub">物種</h2>
            <div className="flex flex-wrap gap-2">
              {species.map((s) => (
                <Link key={s.id} href={`/species/${s.id}`} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-wash">
                  {s.common_name} <span className="sci text-xs text-sub">{s.scientific_name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {!!ll.length && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-sub">商品</h2>
              <Link href={`/market?q=${encodeURIComponent(q)}`} className="text-sm text-accent">
                更多
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ll.map((l) => (
                <ListingCard key={l.id} l={l} cover={coverOf(lm.get(l.id))} />
              ))}
            </div>
          </section>
        )}
        {!!pl.length && (
          <section>
            <h2 className="text-sm font-semibold text-sub">文章</h2>
            {pl.map((p) => (
              <PostCard key={p.id} post={p} cover={coverOf(pm.get(p.id))} />
            ))}
          </section>
        )}
        {!!users?.length && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-sub">會員</h2>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <Link key={u.id} href={`/u/${u.id}`} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-wash">
                  <Avatar path={u.avatar_path} name={u.username} size={24} />
                  {u.username}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="搜尋" />
      <form className="mb-5 flex gap-2">
        <input name="q" defaultValue={q} placeholder="物種、文章、商品、會員" className="input" autoFocus={!q} aria-label="搜尋" />
        <button className="btn btn-primary">搜尋</button>
      </form>
      {results}
    </div>
  );
}
