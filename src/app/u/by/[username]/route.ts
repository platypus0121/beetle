import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 讓內容中的 @暱稱 可以連到個人頁
export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("username", decodeURIComponent(username)).maybeSingle();
  return NextResponse.redirect(new URL(data ? `/u/${data.id}` : "/", request.url));
}
