import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = { title: "評價", robots: { index: false } };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("id, status, buyer_id, seller_id, buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username)")
    .eq("id", Number(id) || 0)
    .maybeSingle();
  if (!o || ![o.buyer_id, o.seller_id].includes(session.userId)) notFound();
  const { data: mine } = await supabase.from("reviews").select("id").eq("order_id", o.id).eq("reviewer_id", session.userId).maybeSingle();
  if (o.status !== "completed" || mine) redirect(`/orders/${o.id}`);
  const target = session.userId === o.buyer_id ? o.seller?.username : o.buyer?.username;
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={`評價 ${target}`} sub="評價會公開顯示在對方的個人頁，送出後無法修改。" />
      <ReviewForm orderId={o.id} />
    </div>
  );
}
