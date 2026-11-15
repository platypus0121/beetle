import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LineChart } from "@/components/LineChart";

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
  // 瀏覽統計（台灣時間）
  const tw = (d: Date) => new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  const today = tw(new Date());
  const from30 = tw(new Date(Date.now() - 29 * 86400_000));
  const from7 = tw(new Date(Date.now() - 6 * 86400_000));
  const [{ data: daily }, { data: pv }] = await Promise.all([
    supabase.from("site_daily_stats").select("day, views, visitors").gte("day", from30).order("day"),
    supabase.from("page_views_daily").select("path, views").gte("day", from7).limit(10000),
  ]);
  const days = daily ?? [];
  const todayRow = days.find((d) => d.day === today);
  const sum = (k: "views" | "visitors", from: string) => days.filter((d) => d.day >= from).reduce((a, d) => a + d[k], 0);
  const top = [...(pv ?? []).reduce((m, r) => m.set(r.path, (m.get(r.path) ?? 0) + r.views), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const viewStats = [
    ["今日瀏覽", todayRow?.views ?? 0],
    ["今日訪客", todayRow?.visitors ?? 0],
    ["近 7 天瀏覽", sum("views", from7)],
    ["近 7 天訪客（每日加總）", sum("visitors", from7)],
    ["近 30 天瀏覽", sum("views", from30)],
    ["近 30 天訪客（每日加總）", sum("visitors", from30)],
  ] as const;

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

      <section className="space-y-3">
        <h2 className="font-semibold">瀏覽統計</h2>
        <p className="text-xs text-sub">只計算真人瀏覽（排除搜尋引擎爬蟲與後台頁面），訪客以匿名 cookie 區分，不記錄 IP。</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {viewStats.map(([k, v]) => (
            <div key={k} className="card p-4">
              <dd className="text-2xl font-semibold tabular-nums">{v.toLocaleString("en-US")}</dd>
              <dt className="mt-1 text-sm text-sub">{k}</dt>
            </div>
          ))}
        </dl>
        {days.length > 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-3">
              <h3 className="mb-1 text-sm font-medium">每日訪客（近 30 天）</h3>
              <LineChart points={days.map((d) => ({ date: d.day, value: d.visitors }))} unit="人" label="訪客" />
            </div>
            <div className="card p-3">
              <h3 className="mb-1 text-sm font-medium">每日瀏覽（近 30 天）</h3>
              <LineChart points={days.map((d) => ({ date: d.day, value: d.views }))} unit="次" label="瀏覽" />
            </div>
          </div>
        ) : (
          <p className="notice">累積兩天以上的資料後會顯示趨勢圖。</p>
        )}
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-medium">近 7 天熱門頁面</h3>
          {top.length === 0 ? (
            <p className="text-sm text-sub">還沒有資料。</p>
          ) : (
            <ol className="divide-y divide-line text-sm">
              {top.map(([path, n]) => (
                <li key={path} className="flex items-center justify-between gap-3 py-1.5">
                  <Link href={path} className="min-w-0 truncate text-accent hover:underline">
                    {safeDecode(path)}
                  </Link>
                  <span className="shrink-0 tabular-nums text-sub">{n.toLocaleString("en-US")}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function safeDecode(p: string) {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}
