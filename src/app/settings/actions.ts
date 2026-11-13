"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CITIES, NOTIFICATION_TYPES } from "@/lib/constants";
import { passwordSchema, usernameSchema } from "@/lib/validation";
import { dbError, fail, type ActionResult } from "@/lib/result";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

export async function saveProfile(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const username = usernameSchema.safeParse(form.get("username"));
  if (!username.success) return fail(username.error.issues[0].message);
  const bio = String(form.get("bio") ?? "").trim();
  if (bio.length > 500) return fail("自我介紹最多 500 字");
  const city = String(form.get("city") ?? "");
  const avatar = String(form.get("avatar_path") ?? "");
  if (avatar && !avatar.startsWith(`${userId}/`)) return fail("頭像路徑不正確");
  const { error } = await supabase
    .from("profiles")
    .update({
      username: username.data,
      bio: bio || null,
      city: CITIES.includes(city) ? city : null,
      avatar_path: avatar || null,
      dm_friends_only: form.get("dm_friends_only") === "on",
    })
    .eq("id", userId);
  if (error) return fail(error.code === "23505" ? "這個暱稱已經有人使用" : dbError(error));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveNotificationSettings(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const rows = Object.keys(NOTIFICATION_TYPES).map((type) => ({ user_id: userId, type, enabled: form.get(`n_${type}`) === "on" }));
  const { error } = await supabase.from("notification_settings").upsert(rows);
  if (error) return fail(dbError(error));
  return { ok: true };
}

export async function deletePayoutAccount(form: FormData) {
  const { supabase, userId } = await currentUser();
  if (!userId) return;
  await supabase.from("seller_payout_accounts").delete().eq("id", Number(form.get("id"))).eq("user_id", userId);
  revalidatePath("/settings");
}

export async function changePassword(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("連結已失效，請重新申請重設密碼");
  const pw = passwordSchema.safeParse(form.get("password"));
  if (!pw.success) return fail(pw.error.issues[0].message);
  if (form.get("password") !== form.get("confirm")) return fail("兩次輸入的密碼不一致");
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) return fail(error.code === "same_password" ? "新密碼不能和舊密碼相同" : "無法更新密碼，請重新登入後再試");
  return { ok: true };
}
