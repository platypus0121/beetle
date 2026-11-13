import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediaFor } from "@/lib/queries";
import { videoUploadEnabled } from "@/lib/features";
import { PageHeader } from "@/components/ui";
import { PostForm } from "../../PostForm";

export const metadata: Metadata = { title: "編輯文章" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, category, title, body, youtube_id, author_id, species(id, common_name, scientific_name, japanese_name, family_group, is_protected, is_native_tw)")
    .eq("id", Number(id) || 0)
    .maybeSingle();
  if (!post || post.author_id !== session.userId) notFound();
  const media = (await mediaFor("post", [post.id])).get(post.id) ?? [];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="編輯文章" />
      <PostForm
        videoEnabled={videoUploadEnabled()}
        initial={{
          id: post.id,
          category: post.category,
          title: post.title,
          body: post.body,
          youtube_id: post.youtube_id,
          species: post.species,
          images: media.filter((m) => m.kind === "image" && m.url).map((m) => ({ id: m.id, url: m.url! })),
          hasVideo: media.some((m) => m.kind === "video"),
        }}
      />
    </div>
  );
}
