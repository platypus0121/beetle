import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FAMILY_GROUPS } from "@/lib/constants";
import { Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "甲蟲物種圖鑑（鍬形蟲・兜蟲・金龜）",
  description: "鍬形蟲、兜蟲、獨角仙、金龜物種列表：中文俗名、學名、日文名對照，標示保育類，以及各物種的飼育文章與交易。",
  alternates: { canonical: "/species" },
};

export default async function SpeciesPage({ searchParams }: { searchParams: Promise<{ q?: string; g?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 40);
  const g = sp.g && sp.g in FAMILY_GROUPS ? sp.g : null;
  const supabase = await createClient();
  let query = supabase
    .from("species")
    .select("id, common_name, scientific_name, japanese_name, family_group, genus, is_protected, is_native_tw")
    .order("genus")
    .order("scientific_name")
    .limit(500);
  if (g) query = query.eq("family_group", g);
  if (q) query = query.ilike("search_text", `%${q.toLowerCase().replace(/[%_]/g, " ")}%`);
  const { data } = await query;
  const groups = Object.keys(FAMILY_GROUPS).filter((k) => !g || k === g);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="甲蟲物種"
        sub="文章、交易與飼育紀錄都綁定物種，從這裡可以找到同一種蟲的所有內容。"
        action={
          <Link href="/species/submit" className="btn btn-sm">
            提報新物種
          </Link>
        }
      />
      <form className="mb-3 flex gap-2">
        {g && <input type="hidden" name="g" value={g} />}
        <input name="q" defaultValue={q} placeholder="搜尋俗名、學名、日文名" className="input" aria-label="搜尋物種" />
        <button className="btn">搜尋</button>
      </form>
      <div className="mb-4 flex gap-2">
        <Link href={q ? `/species?q=${encodeURIComponent(q)}` : "/species"} className={`chip min-h-8 px-3 ${!g ? "chip-accent" : ""}`}>
          全部
        </Link>
        {Object.entries(FAMILY_GROUPS).map(([k, label]) => (
          <Link key={k} href={`/species?g=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`chip min-h-8 px-3 ${g === k ? "chip-accent" : ""}`}>
            {label}
          </Link>
        ))}
      </div>
      {!data?.length && <Empty title="找不到符合的物種" hint="可以提報新增，版主審核後就會出現" action={<Link href="/species/submit" className="btn btn-sm">提報新物種</Link>} />}
      {groups.map((k) => {
        const list = (data ?? []).filter((s) => s.family_group === k);
        if (!list.length) return null;
        return (
          <section key={k} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-sub">
              {FAMILY_GROUPS[k as keyof typeof FAMILY_GROUPS]}（{list.length}）
            </h2>
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {list.map((s) => (
                <li key={s.id} className="border-b border-line">
                  <Link href={`/species/${s.id}`} className="block py-2.5 hover:bg-wash">
                    <div className="flex items-center gap-2 text-[15px] font-medium">
                      {s.common_name}
                      {s.is_protected && <span className="chip chip-danger">保育類</span>}
                      {s.is_native_tw && !s.is_protected && <span className="chip">台灣原生</span>}
                    </div>
                    <div className="text-xs text-sub">
                      <span className="sci">{s.scientific_name}</span>
                      {s.japanese_name && <span className="ml-2">{s.japanese_name}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
