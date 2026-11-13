import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { coverOf, LISTING_SELECT, mediaFor } from "@/lib/queries";
import { CITIES, FAMILY_GROUPS, SEXES, SHIPPING, STAGES } from "@/lib/constants";
import { price, timeAgo } from "@/lib/format";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Empty, PageHeader, Pager, Tabs } from "@/components/ui";

export const metadata: Metadata = {
  title: "交易",
  description: "鍬形蟲、兜蟲、金龜的活體、標本與飼育用品交易：直購、拍賣競標與徵求。",
};

const PAGE = 24;
type SP = { type?: string; q?: string; group?: string; species?: string; stage?: string; sex?: string; min?: string; max?: string; city?: string; ship?: string; sort?: string; page?: string };

export default async function MarketPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const type = ["fixed", "auction", "wanted"].includes(sp.type ?? "") ? sp.type! : "all";
  const page = Math.min(Math.max(Number(sp.page) || 1, 1), 25);
  const supabase = await createClient();
  const f = {
    q: (sp.q ?? "").trim().slice(0, 40),
    group: sp.group && sp.group in FAMILY_GROUPS ? sp.group : "",
    species: /^\d+$/.test(sp.species ?? "") ? sp.species! : "",
    stage: sp.stage && sp.stage in STAGES ? sp.stage : "",
    sex: sp.sex && sp.sex in SEXES ? sp.sex : "",
    min: /^\d+$/.test(sp.min ?? "") ? sp.min! : "",
    max: /^\d+$/.test(sp.max ?? "") ? sp.max! : "",
    city: CITIES.includes(sp.city ?? "") ? sp.city! : "",
    ship: sp.ship && sp.ship in SHIPPING ? sp.ship : "",
    sort: ["price_asc", "price_desc", "ending"].includes(sp.sort ?? "") ? sp.sort! : "",
  };
  const active = Object.entries(f).filter(([k, v]) => v && k !== "sort").length;
  const qs = (o: Record<string, string | null>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ type: type === "all" ? null : type, ...f, ...o })) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/market?${s}` : "/market";
  };
  const tabs = (
    <Tabs
      current={type}
      items={[
        { key: "all", label: "全部", href: qs({ type: null, page: null }) },
        { key: "fixed", label: "直購", href: qs({ type: "fixed", page: null }) },
        { key: "auction", label: "拍賣", href: qs({ type: "auction", page: null }) },
        { key: "wanted", label: "徵求", href: qs({ type: "wanted", page: null }) },
      ]}
    />
  );
  const header = (
    <>
      <PageHeader
        title="交易"
        action={
          <Link href={type === "wanted" ? "/market/wanted/new" : "/market/new"} className="btn btn-primary btn-sm">
            {type === "wanted" ? "刊登徵求" : "上架"}
          </Link>
        }
      />
      <Link href="/market/guide" className="notice mb-4 flex items-center justify-between gap-2">
        <span>交易前請先看注意事項：保育類禁售、到貨死亡需開箱影片、付款資訊只放交易單。</span>
        <span className="shrink-0 text-accent">查看 ›</span>
      </Link>
      {tabs}
    </>
  );

  if (type === "wanted") {
    let wq = supabase
      .from("wanted_listings")
      .select("id, title, description, budget, city, created_at, user:profiles!wanted_listings_user_id_fkey(id, username), species(common_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .range(0, page * PAGE);
    if (f.species) wq = wq.eq("species_id", Number(f.species));
    if (f.q) wq = wq.ilike("title", `%${f.q.replace(/[%_]/g, " ")}%`);
    const { data } = await wq;
    const list = (data ?? []).slice(0, page * PAGE);
    return (
      <div>
        {header}
        {list.length === 0 ? (
          <Empty title="目前沒有徵求" hint="想找特定的蟲？刊登徵求讓賣家來找你" />
        ) : (
          <ul className="mx-auto max-w-2xl divide-y divide-line">
            {list.map((w) => (
              <li key={w.id} className="relative py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip chip-accent">徵求</span>
                  {w.species && <span className="chip">{w.species.common_name}</span>}
                  {w.city && <span className="chip">{w.city}</span>}
                </div>
                <Link href={`/market/wanted/${w.id}`} className="mt-1 block font-medium after:absolute after:inset-0">
                  {w.title}
                </Link>
                <p className="mt-0.5 text-xs text-sub">
                  {w.budget ? `預算 ${price(w.budget)}・` : ""}
                  {w.user?.username}・{timeAgo(w.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Pager href={qs({ page: String(page + 1) })} hasMore={(data ?? []).length > page * PAGE} />
      </div>
    );
  }

  const select = f.group
    ? LISTING_SELECT.replace("species(", "species!inner(family_group, ")
    : type === "auction" && f.sort === "ending"
      ? LISTING_SELECT.replace("auctions(", "auctions!inner(")
      : LISTING_SELECT;
  let query = supabase.from("listings").select(select).eq("status", "active");
  if (type !== "all") query = query.eq("sale_type", type);
  if (f.group) query = query.eq("species.family_group", f.group);
  if (f.species) query = query.eq("species_id", Number(f.species));
  if (f.stage) query = query.eq("stage", f.stage);
  if (f.sex) query = query.eq("sex", f.sex);
  if (f.min) query = query.gte("price", Number(f.min));
  if (f.max) query = query.lte("price", Number(f.max));
  if (f.city) query = query.eq("city", f.city);
  if (f.ship) query = query.contains("shipping_methods", [f.ship]);
  if (f.q) {
    const t = f.q.replace(/[%_,()]/g, " ");
    query = query.or(`title.ilike.%${t}%,scientific_name.ilike.%${t}%,origin.ilike.%${t}%`);
  }
  if (f.sort === "price_asc") query = query.order("price");
  else if (f.sort === "price_desc") query = query.order("price", { ascending: false });
  else if (f.sort === "ending" && type === "auction") query = query.order("ends_at", { referencedTable: "auctions" });
  const { data } = await query.order("created_at", { ascending: false }).range(0, page * PAGE);
  const all = (data ?? []) as unknown as ListingCardData[];
  const list = all.slice(0, page * PAGE);
  const media = await mediaFor("listing", list.map((l) => l.id));
  let speciesName: string | null = null;
  if (f.species) speciesName = (await supabase.from("species").select("common_name").eq("id", Number(f.species)).maybeSingle()).data?.common_name ?? null;

  return (
    <div>
      {header}
      <details className="mb-4 rounded-xl border border-line" open={active > 0}>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3.5 text-sm font-medium">
          篩選與排序{active > 0 && `（${active}）`}
          <span className="text-faint">▾</span>
        </summary>
        <form className="grid grid-cols-2 gap-2.5 border-t border-line p-3.5 sm:grid-cols-4">
          {type !== "all" && <input type="hidden" name="type" value={type} />}
          {f.species && <input type="hidden" name="species" value={f.species} />}
          <input name="q" defaultValue={f.q} placeholder="關鍵字、學名、產地" className="input col-span-2" aria-label="關鍵字" />
          <Select name="group" value={f.group} label="分類" options={FAMILY_GROUPS} />
          <Select name="stage" value={f.stage} label="類型" options={STAGES} />
          <Select name="sex" value={f.sex} label="性別" options={SEXES} />
          <Select name="ship" value={f.ship} label="寄送方式" options={SHIPPING} />
          <select name="city" defaultValue={f.city} className="input" aria-label="縣市">
            <option value="">所有縣市</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select name="sort" defaultValue={f.sort} className="input" aria-label="排序">
            <option value="">最新上架</option>
            <option value="price_asc">價格低到高</option>
            <option value="price_desc">價格高到低</option>
            {type === "auction" && <option value="ending">即將結標</option>}
          </select>
          <input name="min" defaultValue={f.min} inputMode="numeric" placeholder="最低價" className="input" aria-label="最低價" />
          <input name="max" defaultValue={f.max} inputMode="numeric" placeholder="最高價" className="input" aria-label="最高價" />
          <div className="col-span-2 flex gap-2 sm:col-span-4">
            <button className="btn btn-primary btn-sm flex-1">套用</button>
            <Link href={type === "all" ? "/market" : `/market?type=${type}`} className="btn btn-sm">
              清除
            </Link>
          </div>
        </form>
      </details>
      {speciesName && (
        <p className="mb-3 text-sm">
          物種：<span className="chip chip-accent">{speciesName}</span>{" "}
          <Link href={qs({ species: null })} className="text-xs text-sub underline">
            取消
          </Link>
        </p>
      )}
      {list.length === 0 ? (
        <Empty title="沒有符合的商品" hint={active ? "試著放寬篩選條件" : "成為第一個上架的人"} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((l) => (
            <ListingCard key={l.id} l={l} cover={coverOf(media.get(l.id))} />
          ))}
        </div>
      )}
      <Pager href={qs({ page: String(page + 1) })} hasMore={all.length > page * PAGE} />
    </div>
  );
}

function Select({ name, value, label, options }: { name: string; value: string; label: string; options: Record<string, string> }) {
  return (
    <select name={name} defaultValue={value} className="input" aria-label={label}>
      <option value="">{label}：全部</option>
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}
