import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 記錄一次瀏覽。不存 IP 或任何個資：只用隨機的匿名 cookie 編號算不重複訪客。
// 搜尋引擎爬蟲、後台與 API 路徑不計。
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|line-poker|preview|headless|lighthouse/i;
const SKIP = /^\/(admin|api|_next|auth)(\/|$)/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  if (BOT.test(req.headers.get("user-agent") ?? "")) return res;
  // 只接受本站頁面送來的請求
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return res;
    } catch {
      return res;
    }
  }

  let path = "";
  try {
    path = String(((await req.json()) as { path?: unknown }).path ?? "");
  } catch {
    return res;
  }
  if (!path.startsWith("/") || path.length > 200 || SKIP.test(path)) return res;

  let vid = req.cookies.get("vid")?.value ?? "";
  if (!UUID.test(vid)) {
    vid = crypto.randomUUID();
    res.cookies.set("vid", vid, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  try {
    await createAdminClient().rpc("record_view", { p_visitor: vid, p_path: path });
  } catch {
    // 統計失敗不影響瀏覽
  }
  return res;
}
