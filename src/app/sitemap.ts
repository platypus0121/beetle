import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

// 只列公開內容；以未登入身分查詢，RLS 會自動排除隱藏與私人資料。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fixed = ["", "/market", "/species", "/shops", "/breeding/public", "/market/guide", "/rules", "/terms", "/privacy"].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const }));
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const [{ data: species }, { data: posts }, { data: listings }] = await Promise.all([
      supabase.from("species").select("id").limit(2000),
      supabase.from("posts").select("id, updated_at").eq("status", "published").order("id", { ascending: false }).limit(5000),
      supabase.from("listings").select("id, updated_at").eq("status", "active").order("id", { ascending: false }).limit(5000),
    ]);
    return [
      ...fixed,
      ...(species ?? []).map((s) => ({ url: `${base}/species/${s.id}` })),
      ...(posts ?? []).map((p) => ({ url: `${base}/posts/${p.id}`, lastModified: p.updated_at })),
      ...(listings ?? []).map((l) => ({ url: `${base}/market/${l.id}`, lastModified: l.updated_at })),
    ];
  } catch {
    return fixed;
  }
}
