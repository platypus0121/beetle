"use server";
import { setFlash } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { firstError, firstField, listingSchema } from "@/lib/validation";
import { attachImages, attachVideo, removeMediaByIds, removeMediaOf } from "@/lib/media";
import { CITIES } from "@/lib/constants";
import { dbError, fail, type ActionResult } from "@/lib/result";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

const AUCTION_DAYS = [1, 2, 3, 5, 7, 10, 14];

export async function saveListing(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const days = Number(form.get("auction_days"));
  const parsed = listingSchema.safeParse({
    sale_type: form.get("sale_type"),
    species_id: form.get("species_id"),
    title: form.get("title"),
    description: form.get("description") ?? "",
    origin: form.get("origin") ?? "",
    origin_is_taiwan: form.get("origin_is_taiwan") === "on",
    generation: form.get("generation") ?? "",
    emerged_on: form.get("emerged_on") || null,
    size_mm: form.get("size_mm"),
    sex: form.get("sex") ?? "unknown",
    stage: form.get("stage"),
    price: form.get("price"),
    shipping_methods: form.getAll("shipping_methods"),
    city: form.get("city") ?? "",
    breeding_proof_path: form.get("breeding_proof_path") ?? "",
    media_ids: form.getAll("media_ids"),
    video_upload_id: form.get("video_upload_id") || null,
    agreed: form.get("agreed") === "on",
    min_increment: form.get("min_increment") || undefined,
    ends_at: AUCTION_DAYS.includes(days) ? new Date(Date.now() + days * 86400_000).toISOString() : undefined,
    buy_now_price: form.get("buy_now_price"),
    reserve_price: form.get("reserve_price"),
  });
  if (!parsed.success) {
    const field = firstField(parsed.error);
    return fail(firstError(parsed.error), field === "ends_at" ? "auction_days" : field);
  }
  const v = parsed.data;
  if (v.city && !CITIES.includes(v.city)) return fail("縣市不正確");
  const editId = Number(form.get("id")) || null;
  const supply = v.stage === "supply";
  const row = {
    species_id: v.species_id,
    title: v.title,
    description: v.description,
    origin: supply ? null : (v.origin ?? null),
    origin_is_taiwan: supply ? false : v.origin_is_taiwan,
    generation: supply ? null : (v.generation ?? null),
    emerged_on: supply ? null : (v.emerged_on ?? null),
    size_mm: supply ? null : v.size_mm,
    sex: supply ? ("unknown" as const) : v.sex,
    stage: v.stage,
    price: v.price,
    shipping_methods: v.shipping_methods,
    city: v.city ?? null,
    breeding_proof_path: v.breeding_proof_path ?? null,
  };

  let listingId: number;
  if (editId) {
    const { data, error } = await supabase.from("listings").update(row).eq("id", editId).eq("seller_id", userId).select("id").maybeSingle();
    if (error) return fail(dbError(error));
    if (!data) return fail("找不到商品或沒有權限修改");
    listingId = data.id;
    await removeMediaByIds(userId, form.getAll("removed_media").map(Number).filter(Boolean));
  } else {
    const { data, error } = await supabase
      .from("listings")
      .insert({ ...row, seller_id: userId, sale_type: v.sale_type })
      .select("id")
      .single();
    if (error) return fail(dbError(error));
    listingId = data.id;
    if (v.sale_type === "auction") {
      const { error: aErr } = await supabase.rpc("create_auction", {
        p_listing: listingId,
        p_start_price: v.price,
        p_min_increment: v.min_increment!,
        p_ends_at: v.ends_at!,
        p_buy_now: v.buy_now_price ?? undefined,
        p_reserve: v.reserve_price ?? undefined,
      });
      if (aErr) {
        await supabase.from("listings").delete().eq("id", listingId);
        return fail(aErr.code === "23514" ? "直購價需高於起標價" : dbError(aErr));
      }
    }
  }
  const kept = Number(form.get("kept_count")) || 0;
  const img = await attachImages(userId, v.media_ids, "listing", listingId, kept);
  if (!img.ok) return fail(dbError({ code: "P0001", message: img.error }));
  const vid = await attachVideo(userId, v.video_upload_id, "listing", listingId);
  if (!vid.ok) return fail(vid.error);
  revalidatePath("/market");
  await setFlash(editId ? "商品已更新" : "商品已上架");
  redirect(`/market/${listingId}`);
}

export async function setListingStatus(form: FormData) {
  const { supabase, userId } = await currentUser();
  const id = Number(form.get("id"));
  const status = form.get("status") === "active" ? "active" : "closed";
  if (!userId || !id) return;
  await supabase.from("listings").update({ status }).eq("id", id).eq("seller_id", userId);
  revalidatePath(`/market/${id}`);
}

export async function deleteListing(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  const id = Number(form.get("id"));
  if (!userId || !id) return fail("請先登入");
  const { data, error } = await supabase.from("listings").delete().eq("id", id).select("id");
  if (error) return fail(error.code === "23503" ? "已有交易紀錄的商品不能刪除，請改為下架" : dbError(error));
  if (data?.length) await removeMediaOf("listing", id);
  revalidatePath("/market");
  await setFlash("商品已刪除");
  redirect("/market");
}

export async function createOrder(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  if (form.get("agreed") !== "on") return fail("請先閱讀並勾選交易注意事項");
  const { data, error } = await supabase.rpc("create_order", {
    p_listing: Number(form.get("listing_id")),
    p_shipping: String(form.get("shipping")),
    p_note: String(form.get("note") ?? ""),
  });
  if (error) return fail(dbError(error));
  await setFlash("已送出購買需求，等賣家確認");
  redirect(`/orders/${data}`);
}

export async function placeBid(_: unknown, form: FormData): Promise<ActionResult<{ leading: boolean; current_price: number; extended: boolean }>> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  if (form.get("agreed") !== "on") return fail("請先閱讀並勾選交易注意事項");
  const listing = Number(form.get("listing_id"));
  const amount = Number(form.get("amount"));
  if (!Number.isInteger(amount) || amount <= 0) return fail("請輸入出價金額（整數）");
  const { data, error } = await supabase.rpc("place_bid", { p_listing: listing, p_max: amount });
  if (error) return fail(dbError(error));
  revalidatePath(`/market/${listing}`);
  return { ok: true, data: data as { leading: boolean; current_price: number; extended: boolean } };
}

export async function buyNow(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  if (form.get("agreed") !== "on") return fail("請先閱讀並勾選交易注意事項");
  const { data, error } = await supabase.rpc("buy_now", { p_listing: Number(form.get("listing_id")) });
  if (error) return fail(dbError(error));
  await setFlash("已直購得標，請依交易單付款");
  redirect(`/orders/${data}`);
}

export async function cancelAuction(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const listing = Number(form.get("listing_id"));
  const { error } = await supabase.rpc("cancel_auction", { p_listing: listing, p_reason: String(form.get("reason") ?? "") });
  if (error) return fail(dbError(error));
  revalidatePath(`/market/${listing}`);
  return { ok: true };
}

export async function saveWanted(_: unknown, form: FormData): Promise<ActionResult> {
  const { supabase, userId } = await currentUser();
  if (!userId) return fail("請先登入");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const budget = Number(form.get("budget")) || null;
  const city = String(form.get("city") ?? "");
  const species = Number(form.get("species_id")) || null;
  if (title.length < 2 || title.length > 80) return fail("標題需 2–80 個字");
  if (description.length > 2000) return fail("說明最多 2000 字");
  if (form.get("agreed") !== "on") return fail("請先閱讀並勾選交易注意事項");
  const { data, error } = await supabase
    .from("wanted_listings")
    .insert({ user_id: userId, species_id: species, title, description, budget, city: CITIES.includes(city) ? city : null })
    .select("id")
    .single();
  if (error) return fail(dbError(error));
  revalidatePath("/market");
  await setFlash("徵求已刊登");
  redirect(`/market/wanted/${data.id}`);
}

export async function closeWanted(form: FormData) {
  const { supabase, userId } = await currentUser();
  const id = Number(form.get("id"));
  if (!userId || !id) return;
  if (form.get("intent") === "delete") {
    await supabase.from("wanted_listings").delete().eq("id", id).eq("user_id", userId);
    redirect("/market?type=wanted");
  }
  await supabase.from("wanted_listings").update({ status: form.get("intent") === "reopen" ? "open" : "closed" }).eq("id", id).eq("user_id", userId);
  revalidatePath(`/market/wanted/${id}`);
}
