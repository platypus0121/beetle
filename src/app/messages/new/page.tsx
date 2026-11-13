import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Thread } from "../Thread";

export const metadata: Metadata = { title: "私訊", robots: { index: false } };

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ to?: string; listing?: string }> }) {
  const sp = await searchParams;
  const { userId } = await requireSession("/messages");
  if (!sp.to || !/^[0-9a-f-]{36}$/i.test(sp.to) || sp.to === userId) notFound();
  const supabase = await createClient();
  const { data: other } = await supabase.from("profiles").select("id, username").eq("id", sp.to).maybeSingle();
  if (!other) notFound();
  const [a, b] = [userId, other.id].sort();
  const { data: existing } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
  let prefill = "";
  if (sp.listing && /^\d+$/.test(sp.listing)) {
    const { data: l } = await supabase.from("listings").select("id, title").eq("id", Number(sp.listing)).maybeSingle();
    if (l) prefill = `你好，想詢問「${l.title}」（商品編號 ${l.id}）\n`;
  }
  if (existing && !prefill) redirect(`/messages/${existing.id}`);
  if (existing) {
    const { data: rows } = await supabase.from("messages").select("id, sender_id, body, image_path, created_at, read_at").eq("conversation_id", existing.id).order("id", { ascending: false }).limit(200);
    return <Thread conversationId={existing.id} meId={userId} other={other} initial={(rows ?? []).reverse()} prefill={prefill} />;
  }
  return <Thread conversationId={null} meId={userId} other={other} initial={[]} prefill={prefill} />;
}
