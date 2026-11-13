import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SPECIMEN_STAGES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "飼育紀錄", description: "記錄每隻個體的體重、頭幅、換瓶、溫度與血統。" };

export default async function BreedingPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const session = await getSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-md pt-4 text-center">
        <h1 className="page-title">飼育紀錄</h1>
        <p className="mt-2 text-sub">替每隻個體記錄體重、頭幅、換瓶、溫度與血統，自動畫出成長曲線，換瓶日到了會提醒你。</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/login?next=/breeding" className="btn btn-primary">
            登入開始記錄
          </Link>
          <Link href="/breeding/public" className="btn">
            看看公開的紀錄
          </Link>
        </div>
      </div>
    );
  }
  const stage = (await searchParams).stage;
  const supabase = await createClient();
  let q = supabase
    .from("specimens")
    .select("id, label, stage, sex, visibility, bloodline_name, species(common_name), specimen_measurements(measured_on, weight_g), bottle_changes(next_due_on, changed_on)")
    .eq("owner_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (stage && stage in SPECIMEN_STAGES) q = q.eq("stage", stage);
  const { data } = await q;
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const rows = (data ?? []).map((s) => {
    const m = [...s.specimen_measurements].filter((x) => x.weight_g != null).sort((a, b) => b.measured_on.localeCompare(a.measured_on))[0];
    const lastBottle = [...s.bottle_changes].sort((a, b) => b.changed_on.localeCompare(a.changed_on))[0];
    return { ...s, lastWeight: m, due: lastBottle?.next_due_on ?? null };
  });
  const dueCount = rows.filter((r) => r.due && r.due <= today && r.stage !== "dead").length;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="飼育紀錄"
        action={
          <div className="flex gap-2">
            <Link href="/breeding/temperature" className="btn btn-sm">
              溫度
            </Link>
            <Link href="/breeding/new" className="btn btn-primary btn-sm">
              新增個體
            </Link>
          </div>
        }
      />
      {dueCount > 0 && <p className="notice notice-warn mb-3">有 {dueCount} 隻已到預定換瓶日。</p>}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <Link href="/breeding" className={`chip min-h-8 px-3 ${!stage ? "chip-accent" : ""}`}>
          全部
        </Link>
        {Object.entries(SPECIMEN_STAGES).map(([k, v]) => (
          <Link key={k} href={`/breeding?stage=${k}`} className={`chip min-h-8 px-3 ${stage === k ? "chip-accent" : ""}`}>
            {v}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty title="還沒有個體" hint="建立第一隻，開始記錄體重與換瓶" action={<Link href="/breeding/new" className="btn btn-primary btn-sm">新增個體</Link>} />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((s) => (
            <li key={s.id} className="relative py-3">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/breeding/${s.id}`} className="truncate font-medium after:absolute after:inset-0">
                  {s.label}
                  <span className="ml-1.5 text-sub">{s.sex === "male" ? "♂" : s.sex === "female" ? "♀" : ""}</span>
                </Link>
                <span className="flex shrink-0 gap-1">
                  {s.due && s.due <= today && s.stage !== "dead" && <span className="chip chip-warn">該換瓶</span>}
                  <span className="chip">{SPECIMEN_STAGES[s.stage as keyof typeof SPECIMEN_STAGES]}</span>
                </span>
              </div>
              <p className="mt-0.5 text-xs text-sub">
                {s.species?.common_name}
                {s.bloodline_name && `・${s.bloodline_name}`}
                {s.lastWeight && `・${s.lastWeight.weight_g} g（${formatDate(s.lastWeight.measured_on).slice(5)}）`}
                {s.due && s.due > today && `・下次換瓶 ${formatDate(s.due).slice(5)}`}
                {s.visibility === "public" && "・公開"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
