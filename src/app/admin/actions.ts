"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CITIES, FAMILY_GROUPS } from "@/lib/constants";
import { dbError, fail, type ActionResult } from "@/lib/result";

// 這裡的每個操作都以登入者身分呼叫資料庫；是否為版主由資料庫函式與 RLS 判斷，
// 不是由這層程式碼判斷，所以就算有人直接呼叫 action 也過不了。
async function db() {
  return createClient();
}
const s = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

export async function handleReport(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await db();
  const id = Number(form.get("id"));
  const intent = s(form, "intent");
  const note = s(form, "note");
  const type = s(form, "target_type");
  const targetId = Number(form.get("target_id"));
  if (intent === "hide" && ["post", "comment", "listing", "wanted"].includes(type)) {
    const { error } = await supabase.rpc("mod_set_hidden", { p_type: type, p_id: targetId, p_hidden: true, p_note: note || "經檢舉後由站方隱藏" });
    if (error) return fail(dbError(error));
  }
  const { error } = await supabase.rpc("mod_handle_report", { p_id: id, p_status: intent === "dismiss" ? "dismissed" : "resolved", p_note: note || undefined });
  if (error) return fail(dbError(error));
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function setHidden(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.rpc("mod_set_hidden", {
    p_type: s(form, "type"),
    p_id: Number(form.get("id")),
    p_hidden: form.get("intent") === "hide",
    p_note: s(form, "note") || undefined,
  });
  if (error) return fail(dbError(error));
  revalidatePath("/admin/content");
  return { ok: true };
}

export async function banUser(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await db();
  const days = form.get("intent") === "unban" ? 0 : Number(form.get("days"));
  if (days > 0 && s(form, "reason").length < 2) return fail("請填寫停權原因");
  const { error } = await supabase.rpc("mod_ban", { p_user: s(form, "user"), p_days: days, p_reason: s(form, "reason") });
  if (error) return fail(dbError(error));
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setRole(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.rpc("admin_set_role", { p_user: s(form, "user"), p_role: s(form, "role") });
  if (error) return fail(dbError(error));
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resolveDispute(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await db();
  const note = s(form, "note", 2000);
  if (note.length < 10) return fail("請至少用 10 個字說明裁決理由");
  const order = Number(form.get("order_id"));
  const { error } = await supabase.rpc("resolve_dispute", { p_order: order, p_outcome: s(form, "outcome"), p_fault: s(form, "fault"), p_note: note });
  if (error) return fail(dbError(error));
  revalidatePath("/admin/disputes");
  redirect("/admin/disputes");
}

export async function saveSpecies(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await db();
  const id = Number(form.get("id")) || null;
  const sci = s(form, "scientific_name", 80);
  const group = s(form, "family_group");
  if (!s(form, "common_name", 40) || !sci || !(group in FAMILY_GROUPS)) return fail("請填寫俗名、學名與分類");
  const row = {
    common_name: s(form, "common_name", 40),
    scientific_name: sci,
    japanese_name: s(form, "japanese_name", 40) || null,
    aliases: s(form, "aliases", 200),
    family_group: group,
    genus: sci.split(" ")[0],
    is_protected: form.get("is_protected") === "on",
    is_native_tw: form.get("is_native_tw") === "on",
  };
  const { error } = id ? await supabase.from("species").update(row).eq("id", id) : await supabase.from("species").insert(row);
  if (error) return fail(error.code === "23505" ? "這個學名已經存在" : dbError(error));
  revalidatePath("/admin/species");
  return { ok: true };
}

export async function reviewSubmission(form: FormData) {
  const supabase = await db();
  await supabase.rpc("mod_review_submission", { p_id: Number(form.get("id")), p_approve: form.get("intent") === "approve" });
  revalidatePath("/admin/species");
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export async function saveShop(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await db();
  const id = Number(form.get("id")) || null;
  const name = s(form, "name", 60);
  const city = s(form, "city");
  if (!name || !CITIES.includes(city)) return fail("請填寫店名與縣市");
  // 營業時間：每天一個欄位，格式「13:00-21:00」，多段用逗號，留空＝公休
  let hours: Record<string, string[][]> | null = null;
  if (form.get("hours_known") === "on") {
    hours = {};
    for (const d of DAYS) {
      const raw = s(form, `h_${d}`, 60);
      const spans: string[][] = [];
      for (const part of raw.split(/[,，、]/).map((x) => x.trim()).filter(Boolean)) {
        const m = part.match(/^(\d{1,2}):(\d{2})\s*[-–~～]\s*(\d{1,2}):(\d{2})$/);
        if (!m) return fail(`營業時間格式不正確：「${part}」，請用 13:00-21:00`);
        spans.push([`${m[1].padStart(2, "0")}:${m[2]}`, `${m[3].padStart(2, "0")}:${m[4]}`]);
      }
      hours[d] = spans;
    }
  }
  const url = (k: string) => {
    const v = s(form, k, 300);
    return /^https?:\/\//.test(v) ? v : null;
  };
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const row = {
    name,
    city,
    district: s(form, "district", 20) || null,
    address: s(form, "address", 120) || null,
    phone: s(form, "phone", 30) || null,
    opening_hours: hours,
    hours_note: s(form, "hours_note", 200) || null,
    website: url("website"),
    facebook: url("facebook"),
    instagram: url("instagram"),
    items: s(form, "items", 200) || null,
    lat: lat >= 21 && lat <= 27 ? lat : null,
    lng: lng >= 118 && lng <= 123 ? lng : null,
    status: form.get("status") === "closed" ? "closed" : "open",
    source_url: url("source_url"),
    last_verified_on: /^\d{4}-\d{2}-\d{2}$/.test(s(form, "last_verified_on")) ? s(form, "last_verified_on") : null,
  };
  const { error } = id ? await supabase.from("shops").update(row).eq("id", id) : await supabase.from("shops").insert(row);
  if (error) return fail(dbError(error));
  revalidatePath("/shops");
  revalidatePath("/admin/shops");
  return { ok: true };
}

export async function wordAction(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await db();
  const word = s(form, "word", 40);
  if (form.get("intent") === "delete") {
    const { error } = await supabase.from("banned_words").delete().eq("word", word);
    if (error) return fail(dbError(error));
  } else {
    if (word.length < 2) return fail("禁用詞至少 2 個字");
    const { error } = await supabase.from("banned_words").insert({ word });
    if (error) return fail(error.code === "23505" ? "已經有這個詞了" : dbError(error));
  }
  revalidatePath("/admin/words");
  return { ok: true };
}
