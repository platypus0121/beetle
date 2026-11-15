import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

// 只列公開內容；以未登入身分查詢，RLS 會自動排除隱藏與私人資料。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fixed = [
    ...["", "/market", "/market?type=auction", "/market?type=fixed", "/market?type=wanted", "/species", "/shops"].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.8 })),
    ...["/breeding/public", "/market/guide", "/rules", "/terms", "/privacy"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: 0.4 })),
  ];
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const [{ data: species }, { data: posts }, { data: listings }, { data: shops }, { data: wanted }] = await Promise.all([
      supabase.from("species").select("id").limit(2000),
      supabase.from("posts").select("id, updated_at").eq("status", "published").order("id", { ascending: false }).limit(5000),
      supabase.from("listings").select("id, updated_at").eq("status", "active").order("id", { ascending: false }).limit(5000),
      supabase.from("shops").select("city, last_verified_on").eq("status", "open"),
      supabase.from("wanted_listings").select("id, created_at").eq("status", "open").order("id", { ascending: false }).limit(2000),
    ]);
    // 每個有店家的縣市各一頁
    const cityLast = new Map<string, string | null>();
    for (const s of shops ?? []) if (!cityLast.has(s.city) || (s.last_verified_on ?? "") > (cityLast.get(s.city) ?? "")) cityLast.set(s.city, s.last_verified_on);
    return [
      ...fixed,
      ...(species ?? []).map((s) => ({ url: `${base}/species/${s.id}` })),
      ...(posts ?? []).map((p) => ({ url: `${base}/posts/${p.id}`, lastModified: p.updated_at })),
      ...(listings ?? []).map((l) => ({ url: `${base}/market/${l.id}`, lastModified: l.updated_at })),
      ...(wanted ?? []).map((w) => ({ url: `${base}/market/wanted/${w.id}`, lastModified: w.created_at })),
      ...[...cityLast].map(([c, d]) => ({ url: `${base}/shops?city=${encodeURIComponent(c)}`, lastModified: d ?? undefined, priority: 0.6 })),
    ];
  } catch {
    return fixed;
  }
}
