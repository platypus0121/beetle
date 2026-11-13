import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { videoUploadEnabled } from "@/lib/features";
import { PageHeader } from "@/components/ui";
import { PostForm } from "../PostForm";

export const metadata: Metadata = { title: "發表文章" };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ species?: string }> }) {
  await requireSession("/posts/new");
  const sp = await searchParams;
  let preset = null;
  if (sp.species && /^\d+$/.test(sp.species)) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("species")
      .select("id, common_name, scientific_name, japanese_name, family_group, is_protected, is_native_tw")
      .eq("id", Number(sp.species))
      .maybeSingle();
    preset = data;
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="發表文章" />
      <PostForm videoEnabled={videoUploadEnabled()} presetSpecies={preset} />
    </div>
  );
}
