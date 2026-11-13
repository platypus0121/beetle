import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { LineChart } from "@/components/LineChart";
import { PageHeader } from "@/components/ui";
import { deleteRecord } from "../actions";
import { TemperatureForm } from "../RecordForms";

export const metadata: Metadata = { title: "溫度紀錄", robots: { index: false } };

export default async function TemperaturePage() {
  const { userId } = await requireSession("/breeding/temperature");
  const supabase = await createClient();
  const [{ data: logs }, { data: specimens }] = await Promise.all([
    supabase.from("temperature_logs").select("*, specimen:specimens(label)").eq("owner_id", userId).order("logged_on", { ascending: false }).limit(180),
    supabase.from("specimens").select("id, label").eq("owner_id", userId).neq("stage", "dead").order("label").limit(300),
  ]);
  // 同一天多筆取平均，畫成一條線
  const byDay = new Map<string, number[]>();
  for (const l of logs ?? []) byDay.set(l.logged_on, [...(byDay.get(l.logged_on) ?? []), Number(l.temp_c)]);
  const points = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, value: Math.round((v.reduce((x, y) => x + y, 0) / v.length) * 10) / 10 }));
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="溫度紀錄" sub="記錄飼育環境或個別個體的溫濕度。" />
      <TemperatureForm specimens={specimens ?? []} />
      {points.length > 1 && <LineChart points={points} unit="°C" label="每日平均溫度" />}
      {logs?.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-sub">
              <th className="py-1.5 font-normal">日期</th>
              <th className="font-normal">°C</th>
              <th className="font-normal">濕度</th>
              <th className="font-normal">位置／個體</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-line">
                <td className="py-1.5">{formatDate(l.logged_on)}</td>
                <td>{l.temp_c}</td>
                <td>{l.humidity != null ? `${l.humidity}%` : "—"}</td>
                <td className="text-sub">{[l.location, l.specimen?.label].filter(Boolean).join("・")}</td>
                <td className="text-right">
                  <form action={deleteRecord}>
                    <input type="hidden" name="kind" value="temperature" />
                    <input type="hidden" name="id" value={l.id} />
                    <button className="text-xs text-faint hover:text-danger">刪除</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-sub">還沒有溫度紀錄。</p>
      )}
    </div>
  );
}
