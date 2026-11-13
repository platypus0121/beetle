import Link from "next/link";
import { getSession, isBanned } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { BanForm, RoleForm } from "../AdminForms";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; id?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 30);
  const supabase = await createClient();
  const session = await getSession();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(30);
  if (sp.id && /^[0-9a-f-]{36}$/i.test(sp.id)) query = query.eq("id", sp.id);
  else if (q) query = query.ilike("username", `%${q.replace(/[%_]/g, " ")}%`);
  const { data } = await query;
  const ids = (data ?? []).map((u) => u.id);
  const { data: credits } = ids.length === 1 ? await supabase.from("credit_events").select("*").eq("user_id", ids[0]).order("id", { ascending: false }).limit(20) : { data: null };
  return (
    <div>
      <h1 className="page-title mb-3">會員管理</h1>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="搜尋暱稱" aria-label="搜尋暱稱" className="input" />
        <button className="btn">搜尋</button>
      </form>
      <ul className="space-y-3">
        {(data ?? []).map((u) => (
          <li key={u.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/u/${u.id}`} className="font-medium text-accent underline">
                {u.username}
              </Link>
              {u.role !== "user" && <span className="chip chip-accent">{u.role === "admin" ? "管理員" : "版主"}</span>}
              {isBanned(u) && <span className="chip chip-danger">停權至 {formatDateTime(u.banned_until!)}</span>}
              <span className="text-xs text-sub">
                {formatDate(u.created_at)} 加入・信用 {u.credit_score}・完成 {u.completed_orders}・棄標 {u.strikes}
              </span>
            </div>
            {isBanned(u) && u.ban_reason && <p className="text-sm text-sub">原因：{u.ban_reason}</p>}
            {u.id !== session?.userId && <BanForm user={u.id} banned={isBanned(u)} />}
            {session?.profile.role === "admin" && u.id !== session.userId && <RoleForm user={u.id} role={u.role} />}
          </li>
        ))}
      </ul>
      {credits && credits.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 font-semibold">信用分紀錄</h2>
          <ul className="divide-y divide-line text-sm">
            {credits.map((c) => (
              <li key={c.id} className="flex justify-between py-1.5">
                <span>
                  {c.reason}
                  {c.order_id && (
                    <Link href={`/orders/${c.order_id}`} className="ml-2 text-xs text-accent">
                      #{c.order_id}
                    </Link>
                  )}
                </span>
                <span className={c.delta < 0 ? "text-danger" : "text-accent"}>
                  {c.delta > 0 ? "+" : ""}
                  {c.delta}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
