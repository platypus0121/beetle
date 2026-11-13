import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { DisputeForm } from "../DisputeForm";

export const metadata: Metadata = { title: "提出申訴", robots: { index: false } };

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const { data: o } = await supabase.from("orders").select("id, status, buyer_id, seller_id").eq("id", Number(id) || 0).maybeSingle();
  if (!o || ![o.buyer_id, o.seller_id].includes(session.userId)) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={`交易單 #${o.id} 申訴`} sub="付款後沒出貨、收到的商品與說明不符、對方失聯等情況，可以請站方介入。" />
      {["payment_reported", "paid", "shipped"].includes(o.status) ? (
        <DisputeForm orderId={o.id} kind="other" videoEnabled={false} />
      ) : (
        <p className="notice">目前的交易狀態無法提出申訴。尚未付款的交易可以直接取消。</p>
      )}
    </div>
  );
}
