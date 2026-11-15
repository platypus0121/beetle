import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SPECIMEN_STAGES } from "@/lib/constants";
import { Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "公開的飼育紀錄", description: "會員公開分享的甲蟲飼育紀錄：體重變化、換瓶與羽化。" };

export default async function PublicSpecimensPage({ searchParams }: { searchParams: Promise<{ species?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("specimens")
    .select("id, label, stage, sex, final_size_mm, species(id, common_name), owner:profiles!specimens_owner_id_fkey(username)")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(100);
  if (sp.species && /^\d+$/.test(sp.species)) q = q.eq("species_id", Number(sp.species));
  const { data } = await q;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="公開的飼育紀錄" sub={sp.species && data?.[0]?.species ? `品種：${data[0].species.common_name}` : "會員選擇公開分享的個體"} />
      {!data?.length ? (
        <Empty title="還沒有公開的紀錄" />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((s) => (
            <li key={s.id}>
              <Link href={`/breeding/${s.id}`} className="flex items-center justify-between gap-2 py-3 hover:bg-wash">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {s.label} {s.sex === "male" ? "♂" : s.sex === "female" ? "♀" : ""}
                  </div>
                  <div className="text-xs text-sub">
                    {s.species?.common_name}・{s.owner?.username}
                    {s.final_size_mm && `・${s.final_size_mm} mm`}
                  </div>
                </div>
                <span className="chip shrink-0">{SPECIMEN_STAGES[s.stage as keyof typeof SPECIMEN_STAGES]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
