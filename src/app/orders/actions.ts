"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, type ActionResult } from "@/lib/result";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

const SIMPLE = ["accept", "decline", "cancel", "confirm_payment", "reject_payment", "report_unpaid", "ship", "confirm_receipt"];

// 所有狀態變更都交給資料庫的 order_transition()，這裡只負責整理輸入。
export async function orderAction(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const orderId = Number(form.get("order_id"));
  const action = String(form.get("action"));
  let payload: Record<string, unknown> = {};
  if (action === "report_payment") {
    const amount = Number(form.get("amount"));
    const last5 = String(form.get("last5") ?? "").trim();
    const paidAt = String(form.get("paid_at") ?? "");
    if (!Number.isInteger(amount) || amount <= 0) return fail("請填寫付款金額");
    if (last5 && !/^\d{5}$/.test(last5)) return fail("帳號末五碼需為 5 位數字");
    const t = paidAt ? new Date(paidAt) : new Date();
    if (Number.isNaN(t.getTime())) return fail("付款時間不正確");
    payload = { amount, last5: last5 || null, paid_at: t.toISOString(), screenshot_path: String(form.get("screenshot_path") ?? "") || null };
  } else if (action === "ship") {
    payload = { tracking_no: String(form.get("tracking_no") ?? "").trim() };
  } else if (action === "cancel" || action === "reject_payment") {
    payload = { reason: String(form.get("reason") ?? "").trim() };
  } else if (!SIMPLE.includes(action)) {
    return fail("不支援的操作");
  }
  const { error } = await supabase.rpc("order_transition", { p_order: orderId, p_action: action, p_payload: payload as never });
  if (error) return fail(dbError(error));
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function setPaymentInfo(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const orderId = Number(form.get("order_id"));
  const method = String(form.get("method"));
  const bank = String(form.get("bank_code") ?? "").trim();
  const acct = String(form.get("account_no") ?? "").replace(/[\s-]/g, "");
  const name = String(form.get("account_name") ?? "").trim();
  const place = String(form.get("meetup_place") ?? "").trim();
  const time = String(form.get("meetup_time") ?? "");
  if (method === "transfer") {
    if (!/^\d{3}$/.test(bank)) return fail("銀行代碼需為 3 位數字");
    if (!/^\d{6,16}$/.test(acct)) return fail("帳號需為 6–16 位數字");
    if (!name) return fail("請填寫戶名");
  } else if (method !== "meetup") return fail("請選擇收款方式");
  const { error } = await supabase.rpc("set_payment_info", {
    p_order: orderId,
    p_method: method,
    p_bank_code: bank || undefined,
    p_account_no: acct || undefined,
    p_account_name: name || undefined,
    p_meetup_place: place || undefined,
    p_meetup_time: time && !Number.isNaN(Date.parse(time)) ? new Date(time).toISOString() : undefined,
  });
  if (error) return fail(dbError(error));
  if (method === "transfer" && form.get("save") === "on") {
    await supabase.from("seller_payout_accounts").upsert(
      { user_id: userId, bank_code: bank, account_no: acct, account_name: name },
      { onConflict: "user_id,bank_code,account_no", ignoreDuplicates: true },
    );
  }
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function sendOrderMessage(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const orderId = Number(form.get("order_id"));
  const body = String(form.get("body") ?? "").trim();
  if (!body || body.length > 1000) return fail("請輸入 1–1000 字的留言");
  const { error } = await supabase.from("order_messages").insert({ order_id: orderId, sender_id: userId, body });
  if (error) return fail(dbError(error));
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function openDispute(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const orderId = Number(form.get("order_id"));
  const kind = form.get("kind") === "doa" ? "doa" : "other";
  const description = String(form.get("description") ?? "").trim();
  const video = Number(form.get("video_upload_id")) || null;
  if (description.length < 10) return fail("請至少用 10 個字說明狀況");
  if (kind === "doa" && !video) return fail("到貨死亡申訴必須上傳開箱影片");
  const { error } = await supabase.rpc("order_transition", {
    p_order: orderId,
    p_action: "open_dispute",
    p_payload: { kind, description, video_upload_id: video } as never,
  });
  if (error) return fail(dbError(error));
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function submitReview(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const orderId = Number(form.get("order_id"));
  const rating = Number(form.get("rating"));
  if (!(rating >= 1 && rating <= 5)) return fail("請選擇 1–5 星");
  const { error } = await supabase.rpc("submit_review", { p_order: orderId, p_rating: rating, p_body: String(form.get("body") ?? "").trim() });
  if (error) return fail(dbError(error));
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}
