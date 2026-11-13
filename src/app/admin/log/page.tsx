import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

const ACTION: Record<string, string> = { hide: "隱藏", restore: "還原", ban: "停權", unban: "解除停權", set_role: "變更角色", resolve_dispute: "裁決申訴", report_resolved: "檢舉成立", report_dismissed: "檢舉不成立" };

export default async function LogPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("moderation_log").select("*, mod:profiles(username)").order("id", { ascending: false }).limit(200);
  return (
    <div>
      <h1 className="page-title mb-3">操作紀錄</h1>
      <ul className="divide-y divide-line text-sm">
        {(data ?? []).map((l) => (
          <li key={l.id} className="py-2">
            <span className="font-medium">{l.mod?.username ?? "系統"}</span> {ACTION[l.action] ?? l.action}{" "}
            <span className="text-sub">
              {l.target_type} #{l.target_id?.slice(0, 8)}
            </span>
            {l.note && <span className="text-sub">：{l.note}</span>}
            <span className="ml-2 text-xs text-faint">{formatDateTime(l.created_at)}</span>
          </li>
        ))}
        {!data?.length && <li className="py-2 text-sub">還沒有紀錄。</li>}
      </ul>
    </div>
  );
}
