"use client";
import { useActionState, useState } from "react";
import { FormError, Submit } from "@/components/Submit";
import { VideoField } from "@/components/VideoField";
import { openDispute } from "../actions";

export function DisputeForm({ orderId, kind, videoEnabled }: { orderId: number; kind: "doa" | "other"; videoEnabled: boolean }) {
  const [state, action] = useActionState(openDispute, null);
  const [video, setVideo] = useState<number | null>(null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="kind" value={kind} />
      <FormError state={state} />
      {kind === "doa" && (
        <div>
          <span className="label">開箱影片（必填）</span>
          <VideoField purpose="doa" enabled={videoEnabled} onUploaded={setVideo} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="description">
          狀況說明
        </label>
        <textarea id="description" name="description" required minLength={10} maxLength={3000} rows={5} placeholder={kind === "doa" ? "收件時間、包裝狀況、個體狀態…" : "發生了什麼事？希望如何處理？"} className="input" />
      </div>
      <Submit className="btn btn-primary w-full" disabled={kind === "doa" && !video}>
        送出申訴
      </Submit>
      <p className="text-xs text-sub">送出後交易會暫停，由站方查看時間軸與雙方說明後裁決。</p>
    </form>
  );
}
