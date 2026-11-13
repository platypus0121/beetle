"use server";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/constants";
import { dbError, fail, type ActionResult } from "@/lib/result";

const TYPES = ["post", "comment", "listing", "wanted", "user", "message", "shop", "order"] as const;

export async function createReport(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("請先登入");
  const type = String(form.get("target_type")) as (typeof TYPES)[number];
  const targetId = String(form.get("target_id") ?? "");
  const reason = String(form.get("reason"));
  const detail = String(form.get("detail") ?? "").trim().slice(0, 1000);
  if (!TYPES.includes(type) || !targetId || !(reason in REPORT_REASONS)) return fail("檢舉內容不完整");
  const { error } = await supabase.from("reports").insert({
    reporter_id: auth.user.id,
    target_type: type,
    target_id: targetId,
    reason: reason as "spam",
    detail: detail || null,
  });
  if (error) return fail(error.code === "23505" ? "你已經檢舉過了，站方會盡快處理" : dbError(error));
  return { ok: true };
}
