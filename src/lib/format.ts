export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return formatDate(iso);
}

const TZ = "Asia/Taipei";
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
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
