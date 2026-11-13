import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SpecimenForm } from "../SpecimenForm";

export const metadata: Metadata = { title: "新增飼育個體" };

export default async function NewSpecimenPage() {
  const { userId } = await requireSession("/breeding/new");
  const supabase = await createClient();
  const { data: parents } = await supabase.from("specimens").select("id, label, sex").eq("owner_id", userId).order("label").limit(500);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="新增飼育個體" />
      <SpecimenForm parents={parents ?? []} />
    </div>
  );
}
