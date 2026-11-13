import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteVideo } from "@/lib/cloudflare-stream";

// 每日清理（由排程服務以 Authorization: Bearer <CRON_SECRET> 呼叫）：
// 1. 交易結束滿 90 天的開箱影片 → 刪除並在時間軸留下紀錄
// 2. 上傳後 24 小時仍未掛到任何內容的照片與影片 → 刪除
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("authorization") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const result = { doaVideos: 0, orphanImages: 0, orphanVideos: 0 };
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const cutoff90 = new Date(Date.now() - 90 * 86400_000).toISOString();

  // 1. 開箱影片：交易已結束（completed／cancelled）且 closed_at 超過 90 天
  const { data: old } = await admin
    .from("disputes")
    .select("id, order_id, video:video_uploads!inner(id, stream_uid, status), order:orders!inner(status, closed_at)")
    .eq("status", "resolved")
    .neq("video.status", "deleted")
    .in("order.status", ["completed", "cancelled"])
    .lt("order.closed_at", cutoff90)
    .limit(200);
  for (const d of old ?? []) {
    if (!d.video || !(await deleteVideo(d.video.stream_uid))) continue;
    await admin.from("video_uploads").update({ status: "deleted" }).eq("id", d.video.id);
    await admin.from("order_events").insert({ order_id: d.order_id, action: "evidence_deleted", detail: { reason: "交易結束滿 90 天" } });
    result.doaVideos++;
  }

  // 2a. 孤兒照片
  const { data: imgs } = await admin.from("media").select("id, path").eq("kind", "image").is("attached_type", null).lt("created_at", dayAgo).limit(500);
  if (imgs?.length) {
    const paths = imgs.map((m) => m.path).filter((p): p is string => !!p);
    if (paths.length) await admin.storage.from("media").remove(paths);
    await admin.from("media").delete().in("id", imgs.map((m) => m.id));
    result.orphanImages = imgs.length;
  }

  // 2b. 孤兒影片：沒有掛到文章／商品，也沒有被申訴引用
  const { data: vids } = await admin.from("video_uploads").select("id, stream_uid, media(id), disputes(id)").neq("status", "deleted").lt("created_at", dayAgo).limit(500);
  for (const v of vids ?? []) {
    if (v.media.length || v.disputes.length) continue;
    if (!(await deleteVideo(v.stream_uid))) continue;
    await admin.from("video_uploads").update({ status: "deleted" }).eq("id", v.id);
    result.orphanVideos++;
  }
  return NextResponse.json(result);
}
