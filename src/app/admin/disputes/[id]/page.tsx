import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResolveForm } from "../../AdminForms";

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id) || 0;
  const supabase = await createClient();
  const { data: d } = await supabase.from("disputes").select("id, status").eq("order_id", orderId).eq("status", "open").maybeSingle();
  if (!d) notFound();
  return (
    <div className="space-y-4">
      <h1 className="page-title">裁決交易單 #{orderId}</h1>
      <p className="notice">
        請先到
        <Link href={`/orders/${orderId}`} target="_blank" className="mx-1 text-accent underline">
          交易單
        </Link>
        查看完整時間軸、收款資訊、付款回報與截圖、開箱影片及雙方留言，再做裁決。需要補件可以直接在交易單留言。
      </p>
      <ResolveForm orderId={orderId} />
    </div>
  );
}
