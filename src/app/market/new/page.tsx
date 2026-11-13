import type { Metadata } from "next";
import { requireSession, isBanned } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { videoUploadEnabled } from "@/lib/features";
import { PageHeader } from "@/components/ui";
import { ListingForm, type ListingInitial } from "../ListingForm";

export const metadata: Metadata = { title: "上架商品" };

const SPECIES_COLS = "id, common_name, scientific_name, japanese_name, family_group, is_protected, is_native_tw";

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ specimen?: string }> }) {
  const session = await requireSession("/market/new");
  const sp = await searchParams;
  const tooNew = Date.now() - new Date(session.profile.created_at).getTime() < 86400_000;
  let initial: ListingInitial | undefined;
  // 從飼育紀錄帶入個體資料
  if (sp.specimen && /^\d+$/.test(sp.specimen)) {
    const supabase = await createClient();
    const { data: s } = await supabase
      .from("specimens")
      .select(`label, sex, stage, origin, generation, emerged_on, final_size_mm, owner_id, species(${SPECIES_COLS})`)
      .eq("id", Number(sp.specimen))
      .maybeSingle();
    if (s && s.owner_id === session.userId) {
      initial = {
        sale_type: "fixed",
        species: s.species,
        title: `${s.species?.common_name ?? ""} ${s.label}`.trim(),
        description: "",
        origin: s.origin,
        origin_is_taiwan: false,
        generation: s.generation,
        emerged_on: s.emerged_on,
        size_mm: s.final_size_mm,
        sex: s.sex,
        stage: ["egg", "larva", "pupa", "adult"].includes(s.stage) ? s.stage : "adult",
        price: null,
        shipping_methods: [],
        city: session.profile.city,
        breeding_proof_path: null,
        images: [],
        hasVideo: false,
      };
    }
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="上架商品" />
      {isBanned(session.profile) ? (
        <p className="notice notice-danger">帳號停權中，無法上架。</p>
      ) : tooNew ? (
        <p className="notice notice-warn">為了防止廣告帳號，註冊滿 24 小時後才能上架。這段時間可以先逛逛、發文或留言。</p>
      ) : (
        <ListingForm videoEnabled={videoUploadEnabled()} initial={initial} defaultCity={session.profile.city} />
      )}
    </div>
  );
}
