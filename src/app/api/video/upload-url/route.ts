import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDirectUpload, deleteVideo } from "@/lib/cloudflare-stream";
import { videoUploadEnabled } from "@/lib/features";
import { LIMITS } from "@/lib/constants";

// 核發影片上傳許可。檢查順序：已登入 → 未停權 → 大小 → 每日上限（資料庫觸發器）→ 向 Cloudflare 申請一次性上傳網址。
export async function POST(request: NextRequest) {
  if (!videoUploadEnabled()) return NextResponse.json({ error: "本站尚未開放影片上傳" }, { status: 503 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { data: active } = await supabase.rpc("is_active");
  if (!active) return NextResponse.json({ error: "帳號停權中，無法上傳" }, { status: 403 });

  let body: { purpose?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式不正確" }, { status: 400 });
  }
  const purpose = body.purpose === "doa" ? "doa" : "media";
  const maxBytes = purpose === "doa" ? LIMITS.doaVideoMaxBytes : LIMITS.videoMaxBytes;
  const maxSec = purpose === "doa" ? LIMITS.doaVideoMaxSeconds : LIMITS.videoMaxSeconds;
  if (typeof body.size !== "number" || body.size <= 0 || body.size > maxBytes)
    return NextResponse.json({ error: `影片不能超過 ${Math.round(maxBytes / 1048576)} MB` }, { status: 413 });

  const admin = createAdminClient();
  // 先確認今日額度（不建立 Cloudflare 資源），避免被用來灌爆 Cloudflare 帳號
  const [{ count }, { data: limit }] = await Promise.all([
    admin.from("video_uploads").select("id", { count: "exact", head: true }).eq("owner_id", auth.user.id).gt("created_at", new Date(Date.now() - 86400_000).toISOString()),
    admin.rpc("video_daily_limit", { p_user: auth.user.id }),
  ]);
  if ((count ?? 0) >= (limit ?? 3)) return NextResponse.json({ error: `今日影片上傳數已達上限（${limit ?? 3} 支）` }, { status: 429 });

  const upload = await createDirectUpload({ userId: auth.user.id, purpose, maxDurationSeconds: maxSec });
  if (!upload) return NextResponse.json({ error: "影片服務暫時無法使用，請稍後再試" }, { status: 502 });

  // 觸發器會在同一筆交易內再檢查一次每日上限與停權狀態
  const { data: row, error } = await admin.from("video_uploads").insert({ owner_id: auth.user.id, stream_uid: upload.uid, purpose }).select("id").single();
  if (error || !row) {
    await deleteVideo(upload.uid);
    return NextResponse.json({ error: error?.code === "P0001" ? error.message : "無法建立上傳紀錄" }, { status: error?.code === "P0001" ? 429 : 500 });
  }
  return NextResponse.json({ id: row.id, uploadURL: upload.uploadURL });
}
