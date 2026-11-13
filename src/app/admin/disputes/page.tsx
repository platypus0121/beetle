import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { price, timeAgo } from "@/lib/format";
import { Empty } from "@/components/ui";

export default async function DisputesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("disputes")
    .select("id, kind, description, status, outcome, created_at, order:orders(id, amount, listing:listings(title))")
    .order("status")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div>
      <h1 className="page-title mb-3">交易申訴</h1>
      {!data?.length ? (
        <Empty title="沒有申訴" />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((d) => (
            <li key={d.id} className="py-3">
              <Link href={d.status === "open" ? `/admin/disputes/${d.order?.id}` : `/orders/${d.order?.id}`} className="block hover:bg-wash">
                <div className="flex items-center gap-2">
                  <span className={`chip ${d.status === "open" ? "chip-danger" : ""}`}>{d.status === "open" ? "待裁決" : d.outcome === "completed" ? "已裁決：成立" : "已裁決：取消"}</span>
                  <span className="chip">{d.kind === "doa" ? "到貨死亡" : "糾紛"}</span>
                  <span className="ml-auto text-xs text-faint">{timeAgo(d.created_at)}</span>
                </div>
                <p className="mt-1 text-sm font-medium">
                  交易單 #{d.order?.id}・{d.order?.listing?.title}・{d.order && price(d.order.amount)}
                </p>
                <p className="line-clamp-2 text-sm text-sub">{d.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
