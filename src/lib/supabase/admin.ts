import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// service_role 金鑰：繞過 RLS，只能在伺服器使用。
// `server-only` 會讓任何前端元件引用這個檔案時建置失敗。
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
