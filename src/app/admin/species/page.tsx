import { createClient } from "@/lib/supabase/server";
import { FAMILY_GROUPS } from "@/lib/constants";
import { reviewSubmission } from "../actions";
import { SpeciesForm } from "../AdminForms";

export default async function AdminSpeciesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 40);
  const supabase = await createClient();
  const [{ data: subs }, { data: species }] = await Promise.all([
    supabase.from("species_submissions").select("*, user:profiles(username)").eq("status", "pending").order("created_at"),
    q ? supabase.from("species").select("*").ilike("search_text", `%${q.toLowerCase().replace(/[%_]/g, " ")}%`).limit(20) : Promise.resolve({ data: [] }),
  ]);
  return (
    <div className="space-y-7">
      <h1 className="page-title">品種管理</h1>
      <section>
        <h2 className="mb-2 font-semibold">待審提報（{subs?.length ?? 0}）</h2>
        {subs?.length ? (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={s.id} className="card p-3 text-sm">
                <div className="font-medium">
                  {s.common_name} <span className="sci text-sub">{s.scientific_name}</span> {s.japanese_name}
                  <span className="chip ml-2">{FAMILY_GROUPS[s.family_group as keyof typeof FAMILY_GROUPS]}</span>
                </div>
                {s.note && <p className="mt-1 text-sub">{s.note}</p>}
                <p className="mt-1 text-xs text-faint">提報者：{s.user?.username}</p>
                <form action={reviewSubmission} className="mt-2 flex gap-2">
                  <input type="hidden" name="id" value={s.id} />
                  <button name="intent" value="approve" className="btn btn-primary btn-sm">
                    加入品種表
                  </button>
                  <button name="intent" value="reject" className="btn btn-sm">
                    不採用
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-sub">沒有待審的提報。</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">新增品種</h2>
        <SpeciesForm />
      </section>
      <section>
        <h2 className="mb-2 font-semibold">修改品種</h2>
        <form className="mb-3 flex gap-2">
          <input name="q" defaultValue={q} placeholder="搜尋要修改的品種" aria-label="搜尋品種" className="input" />
          <button className="btn">搜尋</button>
        </form>
        <div className="space-y-4">
          {(species ?? []).map((s) => (
            <div key={s.id} className="card p-3">
              <SpeciesForm s={s} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-sub">把品種勾選為「保育類」後，資料庫會立即擋下該品種的所有上架與徵求。</p>
      </section>
    </div>
  );
}
