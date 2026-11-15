import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CITIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { ReportButton } from "@/components/ReportButton";
import { Empty, PageHeader } from "@/components/ui";
import { OpenBadge } from "./OpenBadge";
import { breadcrumb, JsonLd, openingHoursSpec } from "@/lib/seo";

// 每個縣市各自一頁（/shops?city=臺南市），標題與描述帶縣市名，搜尋「台南 甲蟲店」比較容易找到
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ city?: string }> }): Promise<Metadata> {
  const c = (await searchParams).city;
  const city = c && CITIES.includes(c) ? c : null;
  if (!city)
    return {
      title: "全台甲蟲店名錄（鍬形蟲・兜蟲・獨角仙專賣店）",
      description: "全台灣甲蟲專賣店名錄：鍬形蟲、兜蟲、獨角仙實體店的地址、電話、營業時間與公休日，依縣市查詢。",
      alternates: { canonical: "/shops" },
    };
  // 「臺南」也常被寫成「台南」，標題兩種寫法都放；沒有「臺」字的縣市就不重複
  const alt = city.replace("臺", "台");
  const both = alt === city ? city : `${city}・${alt}`;
  return {
    title: `${city}甲蟲店（${alt === city ? "" : alt}鍬形蟲・兜蟲・獨角仙專賣店）`,
    description: `${both}的甲蟲專賣店：地址、電話、營業時間與公休日，出發前先查。`,
    alternates: { canonical: `/shops?city=${encodeURIComponent(city)}` },
  };
}

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
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${city ?? "全台"}甲蟲店`,
            itemListElement: list.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "PetStore",
                name: s.name,
                telephone: s.phone ?? undefined,
                url: s.website ?? s.instagram ?? s.facebook ?? undefined,
                address: { "@type": "PostalAddress", addressRegion: s.city, addressLocality: s.district ?? undefined, streetAddress: s.address ?? undefined, addressCountry: "TW" },
                openingHoursSpecification: openingHoursSpec(s.opening_hours as Hours | null),
              },
            })),
          },
          breadcrumb(city ? [["全台甲蟲店", "/shops"], [`${city}甲蟲店`, `/shops?city=${encodeURIComponent(city)}`]] : [["全台甲蟲店", "/shops"]]),
        ]}
      />
      <PageHeader title={city ? `${city}甲蟲店` : "全台甲蟲店"} sub="只列出查得到近期營業跡象的實體店。" />
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
        <Empty title="這個縣市還沒有收錄的店家" hint="知道哪間店？歡迎私訊版主提供" action={<Link href="/shops" className="btn btn-sm">看全部縣市</Link>} />
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
