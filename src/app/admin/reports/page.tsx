import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { Empty } from "@/components/ui";
import { ReportActions } from "../AdminForms";

const TYPE_LABEL: Record<string, string> = { post: "文章", comment: "留言", listing: "商品", wanted: "徵求", user: "會員", message: "私訊", shop: "店家", order: "交易單" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, detail, created_at, reporter:profiles!reports_reporter_id_fkey(id, username)")
    .eq("status", "open")
    .order("created_at")
    .limit(300);
  // 同一對象的檢舉合併顯示
  const groups = new Map<string, NonNullable<typeof data>>();
  for (const r of data ?? []) groups.set(`${r.target_type}:${r.target_id}`, [...(groups.get(`${r.target_type}:${r.target_id}`) ?? []), r]);
  const ids = (t: string) => [...groups.values()].filter((g) => g[0].target_type === t).map((g) => Number(g[0].target_id));
  const [comments, messages] = await Promise.all([
    ids("comment").length ? supabase.from("comments").select("id, post_id, body").in("id", ids("comment")) : null,
    ids("message").length ? supabase.from("messages").select("id, body, sender_id").in("id", ids("message")) : null,
  ]);
  const href = (t: string, id: string) =>
    t === "post" ? `/posts/${id}` : t === "listing" ? `/market/${id}` : t === "wanted" ? `/market/wanted/${id}` : t === "user" ? `/u/${id}` : t === "order" ? `/orders/${id}` : t === "shop" ? `/admin/shops?edit=${id}` : t === "comment" ? `/posts/${comments?.data?.find((c) => c.id === Number(id))?.post_id ?? ""}#c${id}` : null;
  return (
    <div>
      <h1 className="page-title mb-3">待處理檢舉（{groups.size}）</h1>
      {groups.size === 0 ? (
        <Empty title="沒有待處理的檢舉" />
      ) : (
        <ul className="space-y-3">
          {[...groups.values()].map((g) => {
            const r = g[0];
            const link = href(r.target_type, r.target_id);
            const preview = r.target_type === "comment" ? comments?.data?.find((c) => c.id === Number(r.target_id))?.body : r.target_type === "message" ? messages?.data?.find((m) => m.id === Number(r.target_id))?.body : null;
            return (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="chip chip-accent">{TYPE_LABEL[r.target_type]}</span>
                  {link ? (
                    <Link href={link} className="text-accent underline" target="_blank">
                      查看 #{r.target_id.slice(0, 8)}
                    </Link>
                  ) : (
                    <span>#{r.target_id}</span>
                  )}
                  <span className={`chip ${g.length >= 3 ? "chip-danger" : ""}`}>{g.length} 人檢舉{g.length >= 3 && "・已自動隱藏"}</span>
                </div>
                {preview && <p className="mt-2 rounded bg-wash px-3 py-2 text-sm">{preview}</p>}
                <ul className="mt-2 space-y-1 text-sm">
                  {g.map((x) => (
                    <li key={x.id}>
                      <span className="font-medium">{REPORT_REASONS[x.reason as keyof typeof REPORT_REASONS]}</span>
                      {x.detail && <span className="text-sub">：{x.detail}</span>}
                      <span className="ml-2 text-xs text-faint">
                        {x.reporter?.username}・{timeAgo(x.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
                <ReportActions id={r.id} type={r.target_type} targetId={r.target_id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
