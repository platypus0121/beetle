import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// 瀏覽器端：只使用公開金鑰，所有存取都受 RLS 限制。
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
