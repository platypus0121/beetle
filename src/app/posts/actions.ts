"use server";
import { setFlash } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { commentSchema, firstError, firstField, postSchema } from "@/lib/validation";
import { attachImages, attachVideo, removeMediaByIds, removeMediaOf } from "@/lib/media";
import { youtubeId } from "@/lib/format";
import { dbError, fail, type ActionResult } from "@/lib/result";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

function parsePost(form: FormData) {
  return postSchema.safeParse({
    category: form.get("category"),
    species_id: form.get("species_id"),
    title: form.get("title"),
    body: form.get("body"),
    youtube: form.get("youtube") ?? "",
    status: form.get("intent") === "draft" ? "draft" : "published",
    media_ids: form.getAll("media_ids"),
    video_upload_id: form.get("video_upload_id") || null,
  });
}

export async function savePost(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const parsed = parsePost(form);
  if (!parsed.success) return fail(firstError(parsed.error), firstField(parsed.error));
  const v = parsed.data;
  const yt = v.youtube ? youtubeId(v.youtube) : null;
  if (v.youtube && !yt) return fail("YouTube 連結格式不正確", "youtube");
  const editId = Number(form.get("id")) || null;
  const row = { category: v.category, species_id: v.species_id, title: v.title, body: v.body, youtube_id: yt, status: v.status };

  let postId: number;
  if (editId) {
    const { data, error } = await supabase.from("posts").update(row).eq("id", editId).eq("author_id", userId).select("id").maybeSingle();
    if (error) return fail(dbError(error));
    if (!data) return fail("找不到文章或沒有權限修改");
    postId = data.id;
    const removed = form.getAll("removed_media").map(Number).filter(Boolean);
    await removeMediaByIds(userId, removed);
  } else {
    const { data, error } = await supabase.from("posts").insert({ ...row, author_id: userId }).select("id").single();
    if (error) return fail(dbError(error));
    postId = data.id;
  }
  const kept = Number(form.get("kept_count")) || 0;
  const img = await attachImages(userId, v.media_ids, "post", postId, kept);
  if (!img.ok) return fail(dbError({ code: "P0001", message: img.error }));
  const vid = await attachVideo(userId, v.video_upload_id, "post", postId);
  if (!vid.ok) return fail(vid.error);
  revalidatePath("/");
  await setFlash(v.status === "draft" ? "草稿已儲存" : "已發布");
  redirect(`/posts/${postId}`);
}

export async function deletePost(form: FormData) {
  const { supabase, userId } = await currentUser();
  const id = Number(form.get("id"));
  if (!userId || !id) return;
  const { data } = await supabase.from("posts").delete().eq("id", id).select("id");
  if (data?.length) await removeMediaOf("post", id);
  revalidatePath("/");
  await setFlash("文章已刪除");
  redirect("/");
}

export async function toggleLike(postId: number, liked: boolean): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const { error } = liked
    ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId)
    : await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  if (error && error.code !== "23505") return fail(dbError(error));
  return { ok: true };
}

export async function toggleBookmark(type: "post" | "listing", id: number, marked: boolean): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const { error } = marked
    ? await supabase.from("bookmarks").delete().eq("user_id", userId).eq("target_type", type).eq("target_id", id)
    : await supabase.from("bookmarks").insert({ user_id: userId, target_type: type, target_id: id });
  if (error && error.code !== "23505") return fail(dbError(error));
  return { ok: true };
}

export async function addComment(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const parsed = commentSchema.safeParse({
    post_id: form.get("post_id"),
    parent_id: form.get("parent_id") || null,
    body: form.get("body"),
    media_ids: form.getAll("media_ids"),
  });
  if (!parsed.success) return fail(firstError(parsed.error), firstField(parsed.error));
  const v = parsed.data;
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: v.post_id, author_id: userId, parent_id: v.parent_id ?? null, body: v.body })
    .select("id")
    .single();
  if (error) return fail(dbError(error));
  const img = await attachImages(userId, v.media_ids, "comment", data.id);
  if (!img.ok) return fail(dbError({ code: "P0001", message: img.error }));
  revalidatePath(`/posts/${v.post_id}`);
  return { ok: true };
}

export async function editComment(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const id = Number(form.get("id"));
  const body = String(form.get("body") ?? "").trim();
  if (!id || !body || body.length > 2000) return fail("留言內容不正確");
  const { data, error } = await supabase.from("comments").update({ body }).eq("id", id).eq("author_id", userId).select("post_id").maybeSingle();
  if (error) return fail(dbError(error));
  if (!data) return fail("沒有權限修改");
  revalidatePath(`/posts/${data.post_id}`);
  return { ok: true };
}

export async function deleteComment(form: FormData) {
  const { supabase, userId } = await currentUser();
  const id = Number(form.get("id"));
  if (!userId || !id) return;
  const { data } = await supabase.from("comments").delete().eq("id", id).select("id, post_id");
  if (data?.length) {
    await removeMediaOf("comment", id);
    revalidatePath(`/posts/${data[0].post_id}`);
  }
}

export async function toggleCommentLike(commentId: number, liked: boolean): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const { error } = liked
    ? await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId)
    : await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
  if (error && error.code !== "23505") return fail(dbError(error));
  return { ok: true };
}
