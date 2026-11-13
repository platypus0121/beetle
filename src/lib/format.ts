export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return formatDate(iso);
}

// 一律以台灣時間（UTC+8，無日光節約）顯示。
// 不使用 Intl：伺服器與瀏覽器的 Intl 輸出可能有細微差異，會造成 hydration 不一致。
function taipei(iso: string) {
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return { y: d.getUTCFullYear(), m: p(d.getUTCMonth() + 1), d: p(d.getUTCDate()), h: p(d.getUTCHours()), min: p(d.getUTCMinutes()) };
}
export function formatDate(iso: string): string {
  // 純日期（YYYY-MM-DD）不做時區換算
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.replaceAll("-", "/");
  const t = taipei(iso);
  return `${t.y}/${t.m}/${t.d}`;
}
export function formatDateTime(iso: string): string {
  const t = taipei(iso);
  return `${t.y}/${t.m}/${t.d} ${t.h}:${t.min}`;
}
export function price(n: number): string {
  return `NT$${n.toLocaleString("en-US")}`;
}

export function mediaUrl(path: string | null | undefined, bucket: "media" | "avatars" = "media"): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (/^\/(shorts|embed|live)\//.test(u.pathname)) id = u.pathname.split("/")[2];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
