import type { Metadata } from "next";
import { breadcrumb, JsonLd } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { coverOf, LISTING_SELECT, mediaFor, POST_SELECT } from "@/lib/queries";
import { FAMILY_GROUPS } from "@/lib/constants";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { PostCard, type PostCardData } from "@/components/PostCard";
import { ToggleButton } from "@/components/Toggles";
import { toggleSpeciesFollow } from "../actions";

async function load(id: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("species").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await load(Number(id) || 0);
  if (!s) return { title: "品種" };
  return {
    title: `${s.common_name}（${s.scientific_name}）飼養與買賣`,
    description: `${s.common_name}（學名 ${s.scientific_name}${s.japanese_name ? `，日文 ${s.japanese_name}` : ""}）${s.is_protected ? "為保育類，禁止買賣。" : "的飼養心得、"}飼育文章、交易與飼育紀錄。`,
    alternates: { canonical: `/species/${s.id}` },
  };
}

export default async function SpeciesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await load(Number(id) || 0);
  if (!s) notFound();
  const session = await getSession();
  const supabase = await createClient();
  const [{ data: posts }, { data: listings }, { count: specimenCount }, { count: followers }, followRes] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("species_id", s.id).eq("status", "published").order("created_at", { ascending: false }).limit(10),
    supabase.from("listings").select(LISTING_SELECT).eq("species_id", s.id).eq("status", "active").order("created_at", { ascending: false }).limit(6),
    supabase.from("specimens").select("id", { count: "exact", head: true }).eq("species_id", s.id).eq("visibility", "public"),
    supabase.from("species_follows").select("user_id", { count: "exact", head: true }).eq("species_id", s.id),
    session ? supabase.from("species_follows").select("species_id").eq("species_id", s.id).eq("user_id", session.userId).maybeSingle() : null,
  ]);
  const pList = (posts ?? []) as unknown as PostCardData[];
  const lList = (listings ?? []) as unknown as ListingCardData[];
  const [pm, lm] = await Promise.all([mediaFor("post", pList.map((p) => p.id)), mediaFor("listing", lList.map((l) => l.id))]);
  return (
    <div className="mx-auto max-w-3xl">
      <JsonLd data={breadcrumb([["甲蟲品種", "/species"], [FAMILY_GROUPS[s.family_group as keyof typeof FAMILY_GROUPS], `/species?g=${s.family_group}`], [s.common_name, `/species/${s.id}`]])} />
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-sub">
        <Link href="/species" className="hover:underline">
          品種
        </Link>
        <span>›</span>
        <Link href={`/species?g=${s.family_group}`} className="hover:underline">
          {FAMILY_GROUPS[s.family_group as keyof typeof FAMILY_GROUPS]}
        </Link>
        <span>›</span>
        <span className="sci">{s.genus}</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{s.common_name}</h1>
          <p className="sci mt-0.5 text-sub">{s.scientific_name}</p>
          {s.japanese_name && <p className="text-sm text-sub">{s.japanese_name}</p>}
        </div>
        <ToggleButton on={!!followRes?.data} count={followers ?? 0} action={toggleSpeciesFollow.bind(null, s.id)} labelOn="✓ 追蹤中" labelOff="＋ 追蹤" loggedIn={!!session} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {s.is_native_tw && <span className="chip">台灣原生</span>}
        {s.is_protected && <span className="chip chip-danger">保育類野生動物</span>}
      </div>
      {s.is_protected && (
        <p className="notice notice-danger mt-3">
          本種為《野生動物保育法》公告的保育類野生動物，未經主管機關許可不得騷擾、獵捕、飼養、買賣或持有。本站不開放任何形式的交易與徵求刊登。
        </p>
      )}
      {s.is_native_tw && !s.is_protected && <p className="notice mt-3">台灣產活體上架時需附飼育證明（累代繁殖紀錄等），詳見交易注意事項。</p>}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">上架中的商品</h2>
          <Link href={`/market?species=${s.id}`} className="text-sm text-accent">
            看全部
          </Link>
        </div>
        {lList.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {lList.map((l) => (
              <ListingCard key={l.id} l={l} cover={coverOf(lm.get(l.id))} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-sub">目前沒有上架中的商品。</p>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">相關文章</h2>
          <Link href={`/posts/new?species=${s.id}`} className="text-sm text-accent">
            發表文章
          </Link>
        </div>
        {pList.length ? pList.map((p) => <PostCard key={p.id} post={p} cover={coverOf(pm.get(p.id))} />) : <p className="text-sm text-sub">還沒有文章。</p>}
      </section>

      <p className="mt-6 text-sm text-sub">
        公開的飼育紀錄：{specimenCount ?? 0} 隻　
        <Link href={`/breeding/public?species=${s.id}`} className="text-accent">
          查看
        </Link>
      </p>
    </div>
  );
}
