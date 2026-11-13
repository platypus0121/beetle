import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { videoUploadEnabled } from "@/lib/features";
import { PageHeader } from "@/components/ui";
import { DisputeForm } from "../DisputeForm";

export const metadata: Metadata = { title: "到貨死亡申訴", robots: { index: false } };

export default async function DoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const { data: o } = await supabase.from("orders").select("id, status, buyer_id").eq("id", Number(id) || 0).maybeSingle();
  if (!o || o.buyer_id !== session.userId) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={`交易單 #${o.id} 到貨死亡申訴`} />
      <ul className="notice mb-4 list-disc space-y-1 pl-8">
        <li>必須附上開箱影片：從包裹未拆封開始，一刀未剪拍到確認個體狀況。</li>
        <li>沒有影片、影片有剪接或看不出包裹未拆封，無法受理。</li>
        <li>影片僅買賣雙方與站方可看，交易結束 90 天後自動刪除。</li>
      </ul>
      {o.status === "shipped" ? (
        <DisputeForm orderId={o.id} kind="doa" videoEnabled={videoUploadEnabled()} />
      ) : (
        <p className="notice">到貨死亡申訴需在賣家出貨後、確認收貨前提出。</p>
      )}
    </div>
  );
}
