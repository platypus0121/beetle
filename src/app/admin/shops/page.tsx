import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShopForm, type ShopRow } from "../AdminForms";

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const edit = Number((await searchParams).edit) || 0;
  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("*").order("city").order("name");
  const editing = (data ?? []).find((s) => s.id === edit) as ShopRow | undefined;
  return (
    <div className="space-y-6">
      <h1 className="page-title">店家管理</h1>
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">{editing ? `編輯：${editing.name}` : "新增店家"}</h2>
        <ShopForm key={editing?.id ?? "new"} shop={editing} />
        {editing && (
          <Link href="/admin/shops" className="mt-2 inline-block text-sm text-sub underline">
            取消編輯
          </Link>
        )}
      </section>
      <ul className="divide-y divide-line text-sm">
        {(data ?? []).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 py-2">
            <span>
              <span className="chip mr-2">{s.city}</span>
              {s.name}
              {s.status === "closed" && <span className="chip chip-danger ml-2">已歇業（不顯示）</span>}
              {!s.opening_hours && <span className="chip chip-warn ml-2">未查證營業時間</span>}
            </span>
            <Link href={`/admin/shops?edit=${s.id}`} className="shrink-0 text-accent">
              編輯
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
