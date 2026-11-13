import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth 與 Email 驗證連結的回呼：以一次性 code 換取 session。
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", data.user?.id ?? "").single();
      return NextResponse.redirect(new URL(profile?.onboarded ? next : "/welcome", base));
    }
  }
  return NextResponse.redirect(new URL("/login?error=1", base));
}
