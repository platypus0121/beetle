import "server-only";
import { imageSize } from "image-size";
import { createAdminClient } from "./supabase/admin";
import { LIMITS } from "./constants";

type AttachType = "post" | "listing" | "comment" | "specimen";

// 伺服器端驗證並掛載照片：不相信前端回報的尺寸，實際讀檔頭確認。
// 通過才標為 ready（對外可見）；不合格的檔案直接刪除。張數上限由資料庫觸發器把關。
export async function attachImages(userId: string, mediaIds: number[], type: AttachType, attachedId: number, startPosition = 0) {
  if (mediaIds.length === 0) return { ok: true as const };
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("media")
    .select("id, path, owner_id, kind, attached_type")
    .in("id", mediaIds)
    .eq("owner_id", userId)
    .eq("kind", "image")
    .is("attached_type", null);
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  let position = startPosition;
  for (const id of mediaIds) {
    const row = byId.get(id);
    if (!row?.path || !row.path.startsWith(`${userId}/`)) continue;
    const { data: blob } = await admin.storage.from("media").download(row.path);
    let dims: { width?: number; height?: number } | null = null;
    if (blob && blob.size <= LIMITS.imageMaxBytes) {
      try {
        dims = imageSize(new Uint8Array(await blob.arrayBuffer()));
      } catch {
        dims = null;
      }
    }
    const okSize = dims?.width && dims?.height && Math.max(dims.width, dims.height) <= LIMITS.imageMaxEdge;
    if (!okSize) {
      await admin.storage.from("media").remove([row.path]);
      await admin.from("media").delete().eq("id", id);
      continue;
    }
    const { error } = await admin
      .from("media")
      .update({ status: "ready", attached_type: type, attached_id: attachedId, position: position++, width: dims!.width, height: dims!.height })
      .eq("id", id);
    if (error) return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function attachVideo(userId: string, videoUploadId: number | null | undefined, type: "post" | "listing", attachedId: number) {
  if (!videoUploadId) return { ok: true as const };
  const admin = createAdminClient();
  const { data: v } = await admin.from("video_uploads").select("*").eq("id", videoUploadId).single();
  if (!v || v.owner_id !== userId || v.purpose !== "media" || v.status === "error" || v.status === "deleted")
    return { ok: false as const, error: "影片無法使用，請重新上傳" };
  const { error } = await admin.from("media").insert({
    owner_id: userId,
    kind: "video",
    video_upload_id: v.id,
    status: v.status === "ready" ? "ready" : "pending",
    attached_type: type,
    attached_id: attachedId,
    position: 99,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// 刪除某個內容底下的所有媒體（檔案與紀錄）
export async function removeMediaOf(type: AttachType, attachedId: number) {
  const admin = createAdminClient();
  const { data } = await admin.from("media").select("id, path").eq("attached_type", type).eq("attached_id", attachedId);
  const paths = (data ?? []).map((m) => m.path).filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from("media").remove(paths);
  if (data?.length) await admin.from("media").delete().in("id", data.map((m) => m.id));
}

export async function removeMediaByIds(userId: string, ids: number[]) {
  if (!ids.length) return;
  const admin = createAdminClient();
  const { data } = await admin.from("media").select("id, path").in("id", ids).eq("owner_id", userId);
  const paths = (data ?? []).map((m) => m.path).filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from("media").remove(paths);
  if (data?.length) await admin.from("media").delete().in("id", data.map((m) => m.id));
}
