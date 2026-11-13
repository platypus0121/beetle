"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, type ActionResult } from "@/lib/result";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

export async function toggleFollow(target: string, following: boolean): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const { error } = following
    ? await supabase.from("user_follows").delete().eq("follower_id", userId).eq("followee_id", target)
    : await supabase.from("user_follows").insert({ follower_id: userId, followee_id: target });
  if (error && error.code !== "23505") return fail(dbError(error));
  return { ok: true };
}

export async function friendAction(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const intent = String(form.get("intent"));
  const target = String(form.get("target") ?? "");
  let error = null;
  if (intent === "request") ({ error } = await supabase.rpc("send_friend_request", { p_target: target }));
  else if (intent === "remove") ({ error } = await supabase.rpc("remove_friend", { p_target: target }));
  else if (intent === "accept" || intent === "decline")
    ({ error } = await supabase.rpc("respond_friend_request", { p_id: Number(form.get("id")), p_accept: intent === "accept" }));
  else return fail("不支援的操作");
  if (error) return fail(dbError(error));
  revalidatePath("/friends");
  if (target) revalidatePath(`/u/${target}`);
  return { ok: true };
}

export async function blockAction(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const target = String(form.get("target") ?? "");
  const { error } =
    form.get("intent") === "unblock"
      ? await supabase.from("blocks").delete().eq("blocker_id", userId).eq("blocked_id", target)
      : await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: target });
  if (error && error.code !== "23505") return fail(dbError(error));
  revalidatePath(`/u/${target}`);
  revalidatePath("/settings");
  return { ok: true };
}

export async function markNotifications(form: FormData) {
  const { supabase, userId } = await currentUser();
  if (!userId) return;
  const id = Number(form.get("id"));
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  if (id) q = q.eq("id", id);
  await q;
  revalidatePath("/notifications");
}
