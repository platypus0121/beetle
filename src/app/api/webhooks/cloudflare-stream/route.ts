import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteVideo, requireSignedUrls, verifyWebhook } from "@/lib/cloudflare-stream";
import { LIMITS } from "@/lib/constants";

// Cloudflare Stream 轉檔完成（或失敗）的通知。先驗簽章，再比對大小與長度，超過就刪除。
export async function POST(request: NextRequest) {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get("webhook-signature"), secret)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let v: { uid?: string; readyToStream?: boolean; duration?: number; size?: number; status?: { state?: string } };
  try {
    v = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!v.uid) return NextResponse.json({ ok: true });
  const admin = createAdminClient();
  const { data: row } = await admin.from("video_uploads").select("id, purpose, status").eq("stream_uid", v.uid).maybeSingle();
  if (!row || row.status === "deleted") return NextResponse.json({ ok: true });

  const doa = row.purpose === "doa";
  const maxBytes = doa ? LIMITS.doaVideoMaxBytes : LIMITS.videoMaxBytes;
  const maxSec = doa ? LIMITS.doaVideoMaxSeconds : LIMITS.videoMaxSeconds;
  const tooBig = (typeof v.size === "number" && v.size > maxBytes) || (typeof v.duration === "number" && v.duration > maxSec + 1);
  const failed = v.status?.state === "error";

  if (tooBig || failed) {
    await deleteVideo(v.uid);
    await admin.from("video_uploads").update({ status: "error" }).eq("id", row.id);
    await admin.from("media").delete().eq("video_upload_id", row.id);
  } else if (v.readyToStream) {
    if (doa) await requireSignedUrls(v.uid);
    await admin.from("video_uploads").update({ status: "ready", duration_sec: v.duration ?? null }).eq("id", row.id);
    await admin.from("media").update({ status: "ready" }).eq("video_upload_id", row.id);
  }
  return NextResponse.json({ ok: true });
}
