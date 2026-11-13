"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addComment, deleteComment, editComment, toggleCommentLike } from "@/app/posts/actions";
import { LIMITS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { ImageUploader } from "./ImageUploader";
import { ReportButton } from "./ReportButton";
import { RichText } from "./RichText";
import { FormError, Submit } from "./Submit";
import { ToggleButton } from "./Toggles";
import { Avatar } from "./ui";

export type CommentData = {
  id: number;
  parent_id: number | null;
  body: string;
  status: string;
  like_count: number;
  created_at: string;
  edited_at: string | null;
  author: { id: string; username: string; avatar_path: string | null } | null;
  images: string[];
  liked: boolean;
};

export function CommentForm({ postId, parentId, onDone, autoFocus }: { postId: number; parentId?: number; onDone?: () => void; autoFocus?: boolean }) {
  const [state, action] = useActionState(addComment, null);
  const [nonce, setNonce] = useState(0);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setNonce((n) => n + 1);
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="post_id" value={postId} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <FormError state={state} />
      <textarea name="body" required maxLength={2000} rows={parentId ? 2 : 3} placeholder={parentId ? "回覆…" : "留言…（可用 @暱稱 提及其他會員）"} className="input" autoFocus={autoFocus} />
      <div className="flex items-end justify-between gap-3">
        <div className="w-40">
          <ImageUploader key={nonce} max={LIMITS.commentImages} compact />
        </div>
        <Submit className="btn btn-primary btn-sm">{parentId ? "回覆" : "留言"}</Submit>
      </div>
    </form>
  );
}

export function CommentItem({
  c,
  postId,
  viewerId,
  isMod,
  canReply,
}: {
  c: CommentData;
  postId: number;
  viewerId: string | null;
  isMod: boolean;
  canReply: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editState, editAction] = useActionState(editComment, null);
  useEffect(() => {
    if (editState?.ok) setEditing(false);
  }, [editState]);
  const mine = viewerId && c.author?.id === viewerId;
  return (
    <div id={`c${c.id}`} className="flex gap-2.5 py-3">
      <Link href={c.author ? `/u/${c.author.id}` : "#"} className="shrink-0">
        <Avatar path={c.author?.avatar_path} name={c.author?.username ?? "?"} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link href={c.author ? `/u/${c.author.id}` : "#"} className="font-medium hover:underline">
            {c.author?.username ?? "已刪除的會員"}
          </Link>
          <time className="text-xs text-faint" dateTime={c.created_at} suppressHydrationWarning>
            {timeAgo(c.created_at)}
            {c.edited_at && "（已編輯）"}
          </time>
          {c.status === "hidden" && <span className="chip chip-danger">已被隱藏</span>}
        </div>
        {editing ? (
          <form action={editAction} className="mt-1 space-y-2">
            <input type="hidden" name="id" value={c.id} />
            <FormError state={editState} />
            <textarea name="body" required maxLength={2000} rows={3} defaultValue={c.body} className="input" />
            <div className="flex gap-2">
              <Submit className="btn btn-primary btn-sm">儲存</Submit>
              <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
                取消
              </button>
            </div>
          </form>
        ) : (
          <RichText text={c.body} className="mt-0.5 text-[15px]" />
        )}
        {c.images.length > 0 && (
          <div className="mt-2 flex gap-2">
            {c.images.map((u) => (
              <a key={u} href={u} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" loading="lazy" className="size-24 rounded-lg bg-wash object-cover" />
              </a>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sub">
          <ToggleButton
            on={c.liked}
            count={c.like_count}
            action={toggleCommentLike.bind(null, c.id)}
            labelOn="♥"
            labelOff="♡"
            loggedIn={!!viewerId}
            className="inline-flex min-h-8 items-center gap-1 rounded px-1"
          />
          {canReply && viewerId && (
            <button type="button" className="min-h-8" onClick={() => setReplying((v) => !v)}>
              回覆
            </button>
          )}
          {mine && !editing && c.status === "published" && (
            <button type="button" className="min-h-8" onClick={() => setEditing(true)}>
              編輯
            </button>
          )}
          {(mine || isMod) && (
            <form
              action={deleteComment}
              onSubmit={(e) => {
                if (!confirm("確定刪除這則留言？")) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={c.id} />
              <button className="min-h-8 hover:text-danger">刪除</button>
            </form>
          )}
          {viewerId && !mine && <ReportButton type="comment" id={c.id} className="min-h-8 hover:text-danger" />}
        </div>
        {replying && (
          <div className="mt-2">
            <CommentForm postId={postId} parentId={c.id} onDone={() => setReplying(false)} autoFocus />
          </div>
        )}
      </div>
    </div>
  );
}
