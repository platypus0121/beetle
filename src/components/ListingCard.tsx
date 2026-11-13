import Link from "next/link";
import { SEXES, STAGES } from "@/lib/constants";
import { price, formatDate } from "@/lib/format";

export type ListingCardData = {
  id: number;
  title: string;
  price: number;
  sale_type: string;
  stage: string;
  sex: string;
  size_mm: number | null;
  generation: string | null;
  origin: string | null;
  emerged_on: string | null;
  status: string;
  city: string | null;
  scientific_name: string | null;
  breeding_proof_path: string | null;
  seller: { id: string; username: string; avatar_path: string | null; credit_score: number } | null;
  species: { id: number; common_name: string; scientific_name: string } | null;
  auctions: { ends_at: string; bid_count: number; status: string; buy_now_price: number | null } | null;
};

export function endsIn(iso: string): string {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  if (s <= 0) return "已結標";
  if (s < 3600) return `剩 ${Math.max(1, Math.floor(s / 60))} 分`;
  if (s < 86400) return `剩 ${Math.floor(s / 3600)} 小時`;
  return `剩 ${Math.floor(s / 86400)} 天`;
}

// 交易卡片：比照日系甲蟲賣場慣用的資訊排列——學名、產地、累代、尺寸、性別、羽化日
export function ListingCard({ l, cover }: { l: ListingCardData; cover: string | null }) {
  const specs = [
    l.sex !== "unknown" ? SEXES[l.sex as keyof typeof SEXES] : null,
    l.size_mm ? `${l.size_mm}mm` : null,
    l.generation,
    l.origin,
    l.emerged_on ? `羽化 ${formatDate(l.emerged_on).slice(0, 7)}` : null,
  ].filter(Boolean);
  const auction = l.sale_type === "auction" ? l.auctions : null;
  return (
    <article className="card relative overflow-hidden">
      <div className="relative aspect-[4/3] bg-wash">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-faint">無照片</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium">{STAGES[l.stage as keyof typeof STAGES]}</span>
          {auction && <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-white">拍賣</span>}
        </div>
        {l.status !== "active" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold">
            {l.status === "sold" ? "已售出" : l.status === "reserved" ? "交易中" : l.status === "hidden" ? "已被隱藏" : "已下架"}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium">
          <Link href={`/market/${l.id}`} className="after:absolute after:inset-0">
            {l.title}
          </Link>
        </h3>
        {l.scientific_name && <p className="sci mt-0.5 truncate text-xs text-sub">{l.scientific_name}</p>}
        {specs.length > 0 && <p className="mt-1 truncate text-xs text-sub">{specs.join("・")}</p>}
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-semibold text-accent">{price(l.price)}</span>
          <span className="truncate text-[11px] text-faint">
            {auction ? `${auction.bid_count} 次出價・${endsIn(auction.ends_at)}` : (l.city ?? "")}
          </span>
        </div>
      </div>
    </article>
  );
}
