import "server-only";
import { createClient } from "./supabase/server";
import { mediaUrl } from "./format";

export type MediaItem = {
  id: number;
  kind: string;
  url: string | null;
  width: number | null;
  height: number | null;
  stream_uid: string | null;
  status: string;
};

// 取得一批內容的媒體（依掛載對象分組）
export async function mediaFor(type: "post" | "listing" | "comment" | "specimen", ids: number[]) {
  const map = new Map<number, MediaItem[]>();
  if (!ids.length) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("media")
    .select("id, kind, path, width, height, status, attached_id, position, video_uploads(stream_uid, status)")
    .eq("attached_type", type)
    .in("attached_id", ids)
    .order("position");
  for (const m of data ?? []) {
    const list = map.get(m.attached_id!) ?? [];
    list.push({
      id: m.id,
      kind: m.kind,
      url: mediaUrl(m.path),
      width: m.width,
      height: m.height,
      stream_uid: m.video_uploads?.stream_uid ?? null,
      status: m.kind === "video" ? (m.video_uploads?.status ?? "pending") : m.status,
    });
    map.set(m.attached_id!, list);
  }
  return map;
}

export function coverOf(list: MediaItem[] | undefined): string | null {
  return list?.find((m) => m.kind === "image" && m.url)?.url ?? null;
}

export const POST_SELECT =
  "id, title, body, category, status, like_count, comment_count, created_at, youtube_id, author:profiles!posts_author_id_fkey(id, username, avatar_path), species(id, common_name, scientific_name)" as const;

export const LISTING_SELECT =
  "id, title, price, sale_type, stage, sex, size_mm, generation, origin, emerged_on, status, city, scientific_name, created_at, breeding_proof_path, seller:profiles!listings_seller_id_fkey(id, username, avatar_path, credit_score), species(id, common_name, scientific_name), auctions(ends_at, bid_count, status, buy_now_price)" as const;
