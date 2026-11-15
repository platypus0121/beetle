import { SITE_NAME } from "./constants";

// 結構化資料（JSON-LD）：讓 Google 看得懂頁面是文章、商品、店家還是麵包屑路徑。
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const abs = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // 內容全部來自 JSON.stringify，並跳脫 < 避免 </script> 斷開標籤
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** 麵包屑：[["品種", "/species"], ["長戟大兜蟲", "/species/32"]]，首頁會自動加在最前面 */
export function breadcrumb(items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["首頁", "/"], ...items].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
  };
}

export const organization = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#org`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon.svg`,
};

// 營業時間 jsonb（{"mon":[["13:00","21:00"]], ...}）轉成 schema.org 格式
const DAY_NAMES: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
export function openingHoursSpec(h: Record<string, string[][]> | null) {
  if (!h) return undefined;
  const out: object[] = [];
  for (const [d, spans] of Object.entries(h)) {
    for (const [opens, closes] of spans ?? []) out.push({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[d], opens, closes });
  }
  return out.length ? out : undefined;
}
