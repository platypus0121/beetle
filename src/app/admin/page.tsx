import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const c = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const [reports, disputes, subs, users, newUsers, posts, listings, orders, banned] = await Promise.all([
    c(supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    c(supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open")),
    c(supabase.from("species_submissions").select("id", { count: "exact", head: true }).eq("status", "pending")),
    c(supabase.from("profiles").select("id", { count: "exact", head: true })),
    c(supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since)),
    c(supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", since)),
    c(supabase.from("listings").select("id", { count: "exact", head: true }).gte("created_at", since)),
    c(supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since)),
    c(supabase.from("profiles").select("id", { count: "exact", head: true }).gt("banned_until", new Date().toISOString())),
  ]);
  const todo = [
    { href: "/admin/reports", label: "待處理檢舉", n: reports },
    { href: "/admin/disputes", label: "待裁決申訴", n: disputes },
    { href: "/admin/species", label: "待審物種提報", n: subs },
  ];
  const stats = [
    ["會員總數", users],
    ["近 7 天新會員", newUsers],
    ["近 7 天文章", posts],
    ["近 7 天上架", listings],
    ["近 7 天交易單", orders],
    ["停權中", banned],
  ] as const;
  return (
    <div className="space-y-6">
      <h1 className="page-title">管理後台</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {todo.map((t) => (
          <Link key={t.href} href={t.href} className={`card p-4 ${t.n ? "border-danger/40" : ""}`}>
            <div className={`text-3xl font-semibold ${t.n ? "text-danger" : ""}`}>{t.n}</div>
            <div className="mt-1 text-sm text-sub">{t.label}</div>
          </Link>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="card p-4">
            <dd className="text-2xl font-semibold">{v}</dd>
            <dt className="mt-1 text-sm text-sub">{k}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
