import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediaFor } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { SpecimenForm } from "../../SpecimenForm";

export const metadata: Metadata = { title: "編輯個體" };

export default async function EditSpecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireSession();
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("specimens")
    .select("*, species(id, common_name, scientific_name, japanese_name, family_group, is_protected, is_native_tw)")
    .eq("id", Number(id) || 0)
    .maybeSingle();
  if (!s || s.owner_id !== userId) notFound();
  const [{ data: parents }, media] = await Promise.all([
    supabase.from("specimens").select("id, label, sex").eq("owner_id", userId).order("label").limit(500),
    mediaFor("specimen", [s.id]),
  ]);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="編輯個體" />
      <SpecimenForm
        parents={parents ?? []}
        initial={{ ...s, images: (media.get(s.id) ?? []).filter((m) => m.url).map((m) => ({ id: m.id, url: m.url! })) }}
      />
    </div>
  );
}
