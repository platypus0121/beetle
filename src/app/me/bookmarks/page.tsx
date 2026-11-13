import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { coverOf, LISTING_SELECT, mediaFor, POST_SELECT } from "@/lib/queries";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { PostCard, type PostCardData } from "@/components/PostCard";
import { Empty, PageHeader, Tabs } from "@/components/ui";

export const metadata: Metadata = { title: "收藏", robots: { index: false } };

export default async function BookmarksPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { userId } = await requireSession("/me/bookmarks");
  const tab = (await searchParams).tab === "listings" ? "listing" : "post";
  const supabase = await createClient();
  const { data: marks } = await supabase.from("bookmarks").select("target_id").eq("user_id", userId).eq("target_type", tab).order("created_at", { ascending: false }).limit(100);
  const ids = (marks ?? []).map((m) => m.target_id);
  let body: React.ReactNode = <Empty title="還沒有收藏" />;
  if (ids.length && tab === "post") {
    const { data } = await supabase.from("posts").select(POST_SELECT).in("id", ids);
    const list = ((data ?? []) as unknown as PostCardData[]).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    const media = await mediaFor("post", ids);
    body = list.map((p) => <PostCard key={p.id} post={p} cover={coverOf(media.get(p.id))} />);
  } else if (ids.length) {
    const { data } = await supabase.from("listings").select(LISTING_SELECT).in("id", ids);
    const list = ((data ?? []) as unknown as ListingCardData[]).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    const media = await mediaFor("listing", ids);
    body = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((l) => (
          <ListingCard key={l.id} l={l} cover={coverOf(media.get(l.id))} />
        ))}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="收藏" />
      <Tabs
        current={tab}
        items={[
          { key: "post", label: "文章", href: "/me/bookmarks" },
          { key: "listing", label: "商品", href: "/me/bookmarks?tab=listings" },
        ]}
      />
      {body}
    </div>
  );
}
