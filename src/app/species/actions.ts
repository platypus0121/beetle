"use server";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, type ActionResult } from "@/lib/result";

export async function toggleSpeciesFollow(speciesId: number, following: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("請先登入");
  const { error } = following
    ? await supabase.from("species_follows").delete().eq("user_id", auth.user.id).eq("species_id", speciesId)
    : await supabase.from("species_follows").insert({ user_id: auth.user.id, species_id: speciesId });
  if (error && error.code !== "23505") return fail(dbError(error));
  return { ok: true };
}

export async function submitSpecies(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("請先登入");
  const common = String(form.get("common_name") ?? "").trim();
  const sci = String(form.get("scientific_name") ?? "").trim();
  const jp = String(form.get("japanese_name") ?? "").trim();
  const group = String(form.get("family_group"));
  const note = String(form.get("note") ?? "").trim();
  if (!common || common.length > 40) return fail("請填寫俗名");
  if (!/^[A-Z][a-z]+ [a-z]+( [a-z]+)?$/.test(sci)) return fail("學名格式請用「屬名 種小名（亞種名）」，例如 Dynastes hercules lichyi");
  if (!["stag", "rhino", "scarab"].includes(group)) return fail("請選擇分類");
  const { data: exists } = await supabase.from("species").select("id").eq("scientific_name", sci).maybeSingle();
  if (exists) return fail("品種表已經有這個學名了");
  const { error } = await supabase.from("species_submissions").insert({
    user_id: auth.user.id,
    common_name: common,
    scientific_name: sci,
    japanese_name: jp || null,
    family_group: group,
    note: note || null,
  });
  if (error) return fail(dbError(error));
  return { ok: true };
}
