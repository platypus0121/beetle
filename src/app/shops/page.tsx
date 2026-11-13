import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CITIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { ReportButton } from "@/components/ReportButton";
import { Empty, PageHeader } from "@/components/ui";
import { OpenBadge } from "./OpenBadge";

export const metadata: Metadata = {
  title: "全台甲蟲店",
  description: "全台灣鍬形蟲、兜蟲、金龜專賣店名錄：地址、電話、營業時間與公休日，依縣市查詢。",
};

const DAYS = [
  ["mon", "一"],
  ["tue", "二"],
  ["wed", "三"],
  ["thu", "四"],
  ["fri", "五"],
  ["sat", "六"],
  ["sun", "日"],
] as const;
type Hours = Record<string, string[][]>;

// 把連續且時段相同的日子合併成「週二–週五 13:00–20:00」
function summarize(h: Hours): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < DAYS.length) {
    const key = JSON.stringify(h[DAYS[i][0]] ?? []);
    let j = i;
    while (j + 1 < DAYS.length && JSON.stringify(h[DAYS[j + 1][0]] ?? []) === key) j++;
    const label = i === j ? `週${DAYS[i][1]}` : `週${DAYS[i][1]}–週${DAYS[j][1]}`;
    const spans = (h[DAYS[i][0]] ?? []).map(([a, b]) => `${a}–${b}`).join("、");
    out.push(`${label}　${spans || "公休"}`);
    i = j + 1;
  }
  return out;
}

export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const session = await getSession();
  const { data: all } = await supabase.from("shops").select("*").eq("status", "open").order("name");
  const shops = all ?? [];
  const cities = CITIES.filter((c) => shops.some((s) => s.city === c));
  const city = cities.includes(sp.city ?? "") ? sp.city! : null;
  const list = shops.filter((s) => !city || s.city === city).sort((a, b) => CITIES.indexOf(a.city) - CITIES.indexOf(b.city));
  const latest = shops.map((s) => s.last_verified_on).filter(Boolean).sort().pop();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="全台甲蟲店" sub="只列出查得到近期營業跡象的實體店。" />
      <p className="notice mb-4 text-[13px]">
        營業時間以店家公告為準，出發前建議先打電話或看店家社群確認。{latest && `資料最近查證日期：${formatDate(latest)}。`}
        發現資訊有誤、店家已歇業，或有店家沒被收錄，請按該店的「回報」讓我們更新。
      </p>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <Link href="/shops" className={`chip min-h-8 px-3 ${!city ? "chip-accent" : ""}`}>
          全部（{shops.length}）
        </Link>
        {cities.map((c) => (
          <Link key={c} href={`/shops?city=${encodeURIComponent(c)}`} className={`chip min-h-8 px-3 ${city === c ? "chip-accent" : ""}`}>
            {c}（{shops.filter((s) => s.city === c).length}）
          </Link>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty title="這個縣市還沒有收錄的店家" />
      ) : (
        <ul className="space-y-3">
          {list.map((s) => {
            const hours = s.opening_hours as Hours | null;
            const mapQuery = encodeURIComponent(`${s.name} ${s.address ?? s.city}`);
            return (
              <li key={s.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[16px] font-semibold">{s.name}</h2>
                  <OpenBadge hours={hours} />
                </div>
                <p className="mt-0.5 text-xs text-sub">
                  {s.city}
                  {s.district}
                  {s.items && `・${s.items}`}
                </p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  {s.address && (
                    <div className="flex gap-3">
                      <dt className="w-10 shrink-0 text-sub">地址</dt>
                      <dd>
                        {s.address}{" "}
                        <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-accent underline">
                          地圖
                        </a>
                      </dd>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex gap-3">
                      <dt className="w-10 shrink-0 text-sub">電話</dt>
                      <dd>
                        <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="text-accent underline">
                          {s.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <dt className="w-10 shrink-0 text-sub">時間</dt>
                    <dd>
                      {hours ? (
                        <ul>
                          {summarize(hours).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-sub">尚未查證，請洽店家</span>
                      )}
                      {s.hours_note && <p className="mt-0.5 text-xs text-sub">{s.hours_note}</p>}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                      官網
                    </a>
                  )}
                  {s.facebook && (
                    <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                      Facebook
                    </a>
                  )}
                  {s.instagram && (
                    <a href={s.instagram} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                      {s.instagram.includes("threads") ? "Threads" : "Instagram"}
                    </a>
                  )}
                  <span className="ml-auto">
                    {session ? (
                      <ReportButton type="shop" id={s.id} label="回報資訊有誤／已歇業" reasons={["wrong_info", "closed", "other"]} />
                    ) : (
                      <Link href="/login?next=/shops" className="text-xs text-faint">
                        登入後可回報
                      </Link>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
