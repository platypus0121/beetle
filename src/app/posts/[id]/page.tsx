import type { Metadata } from "next";
import { abs, breadcrumb, JsonLd } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, isBanned, isMod } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediaFor } from "@/lib/queries";
import { POST_CATEGORIES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { CommentForm, CommentItem, type CommentData } from "@/components/Comments";
import { Gallery } from "@/components/Gallery";
import { ReportButton } from "@/components/ReportButton";
import { RichText } from "@/components/RichText";
import { ToggleButton } from "@/components/Toggles";
import { UserLink } from "@/components/ui";
import { deletePost, toggleBookmark, toggleLike } from "../actions";
import { ConfirmForm } from "@/components/ConfirmForm";

async function load(id: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(id, username, avatar_path), species(id, common_name, scientific_name)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await load(Number(id) || 0);
  if (!post || post.status !== "published") return { title: "文章", robots: { index: false } };
  const cover = (await mediaFor("post", [post.id])).get(post.id)?.find((m) => m.kind === "image")?.url;
  return {
    title: post.title,
    description: post.body.slice(0, 120),
    alternates: { canonical: `/posts/${post.id}` },
    // 沒有照片時用站方預設分享圖，否則分享到 FB／LINE 會沒有圖
    openGraph: { title: post.title, description: post.body.slice(0, 120), type: "article", images: [cover ?? "/opengraph-image.png"] },
    twitter: { card: "summary_large_image", images: [cover ?? "/twitter-image.png"] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id) || 0;
  const [post, session] = await Promise.all([load(postId), getSession()]);
  if (!post) notFound();
  const supabase = await createClient();
  const viewerId = session?.userId ?? null;
  const mod = session ? isMod(session.profile) : false;

  const [{ data: rawComments }, postMedia, likeRes, markRes] = await Promise.all([
    supabase
      .from("comments")
      .select("id, parent_id, body, status, like_count, created_at, edited_at, author:profiles!comments_author_id_fkey(id, username, avatar_path)")
      .eq("post_id", postId)
      .order("created_at")
      .limit(500),
    mediaFor("post", [postId]),
    viewerId ? supabase.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", viewerId).maybeSingle() : null,
    viewerId
      ? supabase.from("bookmarks").select("target_id").eq("user_id", viewerId).eq("target_type", "post").eq("target_id", postId).maybeSingle()
      : null,
  ]);
  const commentIds = (rawComments ?? []).map((c) => c.id);
  const [commentMedia, likedRows] = await Promise.all([
    mediaFor("comment", commentIds),
    viewerId && commentIds.length
      ? supabase.from("comment_likes").select("comment_id").eq("user_id", viewerId).in("comment_id", commentIds)
      : null,
  ]);
  const likedSet = new Set((likedRows?.data ?? []).map((r) => r.comment_id));
  const comments: CommentData[] = (rawComments ?? []).map((c) => ({
    ...c,
    images: (commentMedia.get(c.id) ?? []).map((m) => m.url).filter((u): u is string => !!u),
    liked: likedSet.has(c.id),
  }));
  const roots = comments.filter((c) => !c.parent_id);
  const replies = (pid: number) => comments.filter((c) => c.parent_id === pid);
  const mine = viewerId === post.author_id;
  const canComment = session && !isBanned(session.profile) && post.status === "published";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: post.title,
    text: post.body.slice(0, 500),
    datePublished: post.created_at,
    author: { "@type": "Person", name: post.author?.username, url: post.author ? abs(`/u/${post.author.id}`) : undefined },
    url: abs(`/posts/${post.id}`),
    mainEntityOfPage: abs(`/posts/${post.id}`),
    dateModified: post.updated_at,
    inLanguage: "zh-TW",
    image: (postMedia.get(postId) ?? []).filter((m) => m.kind === "image" && m.url).map((m) => m.url!).slice(0, 5),
    ...(post.species ? { about: { "@type": "Thing", name: `${post.species.common_name} ${post.species.scientific_name}` } } : {}),
    interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: post.comment_count },
  };

  return (
    <article className="mx-auto max-w-2xl">
      {post.status === "published" && <JsonLd data={[jsonLd, breadcrumb([[POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES] ?? "討論", `/?cat=${post.category}`], [post.title, `/posts/${post.id}`]])]} />}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Link href={`/?cat=${post.category}`} className="chip chip-accent">
          {POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]}
        </Link>
        {post.species && (
          <Link href={`/species/${post.species.id}`} className="chip">
            {post.species.common_name} <span className="sci">{post.species.scientific_name}</span>
          </Link>
        )}
        {post.status === "draft" && <span className="chip chip-warn">草稿（只有你看得到）</span>}
        {post.status === "hidden" && <span className="chip chip-danger">已被站方隱藏</span>}
      </div>
      <h1 className="text-[22px] leading-snug font-semibold tracking-tight">{post.title}</h1>
      <div className="mt-2 mb-4 flex items-center gap-2 text-sm text-sub">
        {post.author && <UserLink user={post.author} />}
        <span className="text-faint">·</span>
        <time dateTime={post.created_at} className="text-xs text-faint">
          {formatDateTime(post.created_at)}
        </time>
      </div>
      <RichText text={post.body} className="mb-4 text-[16px]" />
      <Gallery media={postMedia.get(postId) ?? []} youtubeId={post.youtube_id} />

      <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <ToggleButton on={!!likeRes?.data} count={post.like_count} action={toggleLike.bind(null, postId)} labelOn="♥ 喜歡" labelOff="♡ 喜歡" loggedIn={!!viewerId} />
        <ToggleButton on={!!markRes?.data} action={toggleBookmark.bind(null, "post", postId)} labelOn="★ 已收藏" labelOff="☆ 收藏" loggedIn={!!viewerId} />
        <div className="ml-auto flex items-center gap-3">
          {mine && post.status !== "hidden" && (
            <Link href={`/posts/${postId}/edit`} className="text-xs text-sub hover:text-ink">
              編輯
            </Link>
          )}
          {(mine || mod) && (
            <ConfirmForm action={deletePost} message="確定刪除這篇文章？刪除後無法復原。" confirmLabel="刪除">
              <input type="hidden" name="id" value={postId} />
              <button className="text-xs text-sub hover:text-danger">刪除</button>
            </ConfirmForm>
          )}
          {viewerId && !mine && <ReportButton type="post" id={postId} />}
        </div>
      </div>

      <section className="mt-4" aria-label="留言">
        <h2 className="mb-2 font-semibold">留言 {post.comment_count}</h2>
        {canComment ? (
          <CommentForm postId={postId} />
        ) : !session ? (
          <p className="notice">
            <Link href={`/login?next=/posts/${postId}`} className="text-accent underline">
              登入
            </Link>
            後即可留言。
          </p>
        ) : null}
        <div className="mt-2 divide-y divide-line">
          {roots.map((c) => (
            <div key={c.id}>
              <CommentItem c={c} postId={postId} viewerId={viewerId} isMod={mod} canReply={!!canComment} />
              {replies(c.id).length > 0 && (
                <div className="ml-10 border-l border-line pl-3">
                  {replies(c.id).map((r) => (
                    <CommentItem key={r.id} c={r} postId={postId} viewerId={viewerId} isMod={mod} canReply={false} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
