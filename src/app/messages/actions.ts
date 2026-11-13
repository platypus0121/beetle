"use server";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, type ActionResult } from "@/lib/result";

export async function sendMessage(recipient: string, body: string, imagePath: string | null): Promise<ActionResult<{ conversationId: number }>> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("請先登入");
  const text = body.trim();
  if (!text && !imagePath) return fail("訊息不能是空的");
  if (text.length > 2000) return fail("訊息最多 2000 字");
  const { data, error } = await supabase.rpc("send_message", { p_recipient: recipient, p_body: text, p_image_path: imagePath ?? undefined });
  if (error) return fail(dbError(error));
  return { ok: true, data: { conversationId: data } };
}

export async function markRead(conversationId: number) {
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conv: conversationId });
}
