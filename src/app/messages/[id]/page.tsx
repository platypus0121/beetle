import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Thread, type Msg } from "../Thread";

export const metadata: Metadata = { title: "私訊", robots: { index: false } };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const convId = Number(id) || 0;
  const { userId } = await requireSession(`/messages/${convId}`);
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("conversations")
    .select("id, a:profiles!conversations_user_a_fkey(id, username), b:profiles!conversations_user_b_fkey(id, username)")
    .eq("id", convId)
    .maybeSingle();
  const other = c?.a?.id === userId ? c?.b : c?.a;
  if (!c || !other) notFound();
  const { data: rows } = await supabase
    .from("messages")
    .select("id, sender_id, body, image_path, created_at, read_at")
    .eq("conversation_id", convId)
    .order("id", { ascending: false })
    .limit(200);
  return <Thread conversationId={convId} meId={userId} other={other} initial={((rows ?? []) as Msg[]).reverse()} />;
}
