import Link from "next/link";
import { POST_CATEGORIES } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { Avatar } from "./ui";

export type PostCardData = {
  id: number;
  title: string;
  body: string;
  category: string;
  status: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  youtube_id: string | null;
  author: { id: string; username: string; avatar_path: string | null } | null;
  species: { id: number; common_name: string; scientific_name: string } | null;
};

export function PostCard({ post, cover }: { post: PostCardData; cover: string | null }) {
  const thumb = cover ?? (post.youtube_id ? `https://i.ytimg.com/vi/${post.youtube_id}/mqdefault.jpg` : null);
  return (
    <article className="press relative flex gap-3 border-b border-line py-4">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className="chip chip-accent">{POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]}</span>
          {post.species && <span className="chip">{post.species.common_name}</span>}
          {post.status === "draft" && <span className="chip chip-warn">草稿</span>}
          {post.status === "hidden" && <span className="chip chip-danger">已被隱藏</span>}
        </div>
        <h2 className="text-[16px] leading-snug font-semibold">
          <Link href={`/posts/${post.id}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>
        <p className="mt-1 line-clamp-2 text-sm text-sub">{post.body}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-faint">
          {post.author && (
            <>
              <Avatar path={post.author.avatar_path} name={post.author.username} size={18} />
              <span className="truncate text-sub">{post.author.username}</span>
            </>
          )}
          <span>·</span>
          <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
          <span className="ml-auto flex shrink-0 items-center gap-3 tabular-nums">
            <span className="inline-flex items-center gap-1" aria-label={`${post.like_count} 個讚`}>
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" strokeLinejoin="round" />
              </svg>
              {post.like_count}
            </span>
            <span className="inline-flex items-center gap-1" aria-label={`${post.comment_count} 則留言`}>
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M4 5h16v11H9l-5 4V5z" strokeLinejoin="round" />
              </svg>
              {post.comment_count}
            </span>
          </span>
        </div>
      </div>
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" loading="lazy" decoding="async" className="size-20 shrink-0 rounded-lg bg-wash object-cover sm:size-24" />
      )}
    </article>
  );
}
