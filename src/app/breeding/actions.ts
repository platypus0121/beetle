"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { attachImages, removeMediaByIds, removeMediaOf } from "@/lib/media";
import { EVENT_TYPES, SPECIMEN_STAGES } from "@/lib/constants";
import { dbError, fail, type ActionResult } from "@/lib/result";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}
const str = (f: FormData, k: string, max: number) => {
  const v = String(f.get(k) ?? "").trim().slice(0, max);
  return v || null;
};
const date = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
const num = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};
const idOrNull = (f: FormData, k: string) => Number(f.get(k)) || null;

export async function saveSpecimen(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const label = str(form, "label", 40);
  const species = idOrNull(form, "species_id");
  const stage = String(form.get("stage"));
  const sex = String(form.get("sex"));
  const size = num(form, "final_size_mm");
  if (!label) return fail("請填寫個體名稱或編號");
  if (!species) return fail("請選擇物種");
  if (!(stage in SPECIMEN_STAGES) || !["male", "female", "unknown"].includes(sex)) return fail("資料不正確");
  if (Number.isNaN(size)) return fail("尺寸不正確");
  const editId = idOrNull(form, "id");
  const sire = idOrNull(form, "sire_id");
  const dam = idOrNull(form, "dam_id");
  if (editId && (sire === editId || dam === editId)) return fail("父母本不能是自己");
  const row = {
    label,
    species_id: species,
    stage,
    sex,
    bloodline_name: str(form, "bloodline_name", 60),
    sire_id: sire,
    dam_id: dam,
    origin: str(form, "origin", 60),
    generation: str(form, "generation", 20),
    hatched_on: date(form, "hatched_on"),
    emerged_on: date(form, "emerged_on"),
    died_on: date(form, "died_on"),
    final_size_mm: size,
    notes: str(form, "notes", 3000),
    visibility: form.get("visibility") === "public" ? "public" : "private",
  };
  let id: number;
  if (editId) {
    const { data, error } = await supabase.from("specimens").update(row).eq("id", editId).eq("owner_id", userId).select("id").maybeSingle();
    if (error) return fail(dbError(error));
    if (!data) return fail("找不到個體");
    id = data.id;
    await removeMediaByIds(userId, form.getAll("removed_media").map(Number).filter(Boolean));
  } else {
    const { data, error } = await supabase.from("specimens").insert({ ...row, owner_id: userId }).select("id").single();
    if (error) return fail(dbError(error));
    id = data.id;
  }
  const img = await attachImages(userId, form.getAll("media_ids").map(Number).filter(Boolean), "specimen", id, Number(form.get("kept_count")) || 0);
  if (!img.ok) return fail(dbError({ code: "P0001", message: img.error }));
  revalidatePath("/breeding");
  redirect(`/breeding/${id}`);
}

export async function deleteSpecimen(form: FormData) {
  const { supabase, userId } = await currentUser();
  const id = Number(form.get("id"));
  if (!userId || !id) return;
  const { data } = await supabase.from("specimens").delete().eq("id", id).eq("owner_id", userId).select("id");
  if (data?.length) await removeMediaOf("specimen", id);
  revalidatePath("/breeding");
  redirect("/breeding");
}

// 量測、換瓶、事件：RLS 只允許個體的主人寫入
export async function addRecord(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const specimen = Number(form.get("specimen_id"));
  const kind = String(form.get("kind"));
  const on = date(form, "on");
  if (!specimen || !on) return fail("請選擇日期");
  let error = null;
  if (kind === "measurement") {
    const w = num(form, "weight_g");
    const h = num(form, "head_width_mm");
    if (Number.isNaN(w) || Number.isNaN(h) || (w === null && h === null)) return fail("請填寫體重或頭幅");
    ({ error } = await supabase.from("specimen_measurements").insert({ specimen_id: specimen, measured_on: on, weight_g: w, head_width_mm: h, note: str(form, "note", 300) }));
  } else if (kind === "bottle") {
    const vol = num(form, "volume_ml");
    if (Number.isNaN(vol)) return fail("容量不正確");
    const next = date(form, "next_due_on");
    if (next && next <= on) return fail("下次換瓶日需晚於這次");
    ({ error } = await supabase.from("bottle_changes").insert({ specimen_id: specimen, changed_on: on, substrate: str(form, "substrate", 60), volume_ml: vol ? Math.round(vol) : null, next_due_on: next, note: str(form, "note", 300) }));
  } else if (kind === "event") {
    const type = String(form.get("event_type"));
    if (!(type in EVENT_TYPES)) return fail("事件類型不正確");
    ({ error } = await supabase.from("specimen_events").insert({ specimen_id: specimen, event_type: type, occurred_on: on, note: str(form, "note", 500) }));
    // 重要事件同步更新個體的階段與日期
    if (!error) {
      const patch =
        type === "hatch" ? { hatched_on: on, stage: "larva" } : type === "pupate" ? { stage: "pupa" } : type === "emerge" ? { emerged_on: on, stage: "adult" } : type === "death" ? { died_on: on, stage: "dead" } : null;
      if (patch) await supabase.from("specimens").update(patch).eq("id", specimen).eq("owner_id", userId);
    }
  } else return fail("不支援的紀錄");
  if (error) return fail(dbError(error));
  revalidatePath(`/breeding/${specimen}`);
  return { ok: true };
}

export async function deleteRecord(form: FormData) {
  const { supabase, userId } = await currentUser();
  if (!userId) return;
  const kind = String(form.get("kind"));
  const id = Number(form.get("id"));
  const table = kind === "measurement" ? "specimen_measurements" : kind === "bottle" ? "bottle_changes" : kind === "event" ? "specimen_events" : kind === "temperature" ? "temperature_logs" : null;
  if (!table || !id) return;
  await supabase.from(table).delete().eq("id", id);
  revalidatePath(kind === "temperature" ? "/breeding/temperature" : `/breeding/${form.get("specimen_id")}`);
}

export async function addTemperature(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const on = date(form, "on");
  const temp = Number(form.get("temp_c"));
  const hum = String(form.get("humidity") ?? "").trim();
  if (!on) return fail("請選擇日期");
  if (!Number.isFinite(temp) || temp < -20 || temp > 60) return fail("溫度需介於 -20 到 60 °C");
  if (hum && !(Number(hum) >= 0 && Number(hum) <= 100)) return fail("濕度需介於 0 到 100");
  const { error } = await supabase.from("temperature_logs").insert({
    owner_id: userId,
    specimen_id: idOrNull(form, "specimen_id"),
    location: str(form, "location", 40),
    logged_on: on,
    temp_c: temp,
    humidity: hum ? Math.round(Number(hum)) : null,
  });
  if (error) return fail(dbError(error));
  revalidatePath("/breeding/temperature");
  return { ok: true };
}
