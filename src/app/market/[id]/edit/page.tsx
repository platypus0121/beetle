import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediaFor } from "@/lib/queries";
import { videoUploadEnabled } from "@/lib/features";
import { PageHeader } from "@/components/ui";
import { ListingForm } from "../../ListingForm";

export const metadata: Metadata = { title: "編輯商品" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const { data: l } = await supabase
    .from("listings")
    .select("*, species(id, common_name, scientific_name, japanese_name, family_group, is_protected, is_native_tw), auctions(bid_count)")
    .eq("id", Number(id) || 0)
    .maybeSingle();
  if (!l || l.seller_id !== session.userId) notFound();
  const locked = !["active", "closed"].includes(l.status) || (l.auctions?.bid_count ?? 0) > 0;
  const media = (await mediaFor("listing", [l.id])).get(l.id) ?? [];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="編輯商品" />
      {locked ? (
        <p className="notice notice-warn">交易進行中、已售出或已有人出價的商品不能修改。</p>
      ) : (
        <ListingForm
          videoEnabled={videoUploadEnabled()}
          initial={{
            id: l.id,
            sale_type: l.sale_type,
            species: l.species,
            title: l.title,
            description: l.description,
            origin: l.origin,
            origin_is_taiwan: l.origin_is_taiwan,
            generation: l.generation,
            emerged_on: l.emerged_on,
            size_mm: l.size_mm,
            sex: l.sex,
            stage: l.stage,
            price: l.price,
            shipping_methods: l.shipping_methods,
            city: l.city,
            breeding_proof_path: l.breeding_proof_path,
            images: media.filter((m) => m.kind === "image" && m.url).map((m) => ({ id: m.id, url: m.url! })),
            hasVideo: media.some((m) => m.kind === "video"),
          }}
        />
      )}
    </div>
  );
}
