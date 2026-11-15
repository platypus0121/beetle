"use client";
import { useActionState, useEffect } from "react";
import { useConfirm } from "./ConfirmDialog";
import { toast } from "./Toaster";
import { blockAction, friendAction } from "@/app/social/actions";

export function FriendButton({ target, state: rel, requestId }: { target: string; state: "none" | "pending_out" | "pending_in" | "friends"; requestId?: number }) {
  const [res, action, pending] = useActionState(friendAction, null);
  const [dialog, guard] = useConfirm();
  useEffect(() => {
    if (res?.ok) toast("已更新好友狀態");
  }, [res]);
  const btn = (intent: string, label: string, cls = "btn btn-sm") => (
    <button name="intent" value={intent} className={cls} disabled={pending}>
      {label}
    </button>
  );
  return (
    <form
      action={action}
      className="inline-flex flex-wrap items-center gap-2"
      onSubmit={guard((e) => {
        const intent = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
        return intent === "remove" && rel === "friends" ? { message: "確定解除好友？", confirmLabel: "解除好友" } : null;
      })}
    >
      {dialog}
      <input type="hidden" name="target" value={target} />
      {requestId && <input type="hidden" name="id" value={requestId} />}
      {rel === "none" && btn("request", "＋ 加好友")}
      {rel === "pending_out" && btn("remove", "已送出邀請（收回）")}
      {rel === "pending_in" && (
        <>
          {btn("accept", "接受好友邀請", "btn btn-primary btn-sm")}
          {btn("decline", "拒絕")}
        </>
      )}
      {rel === "friends" && btn("remove", "✓ 好友")}
      {res && !res.ok && <span className="text-xs text-danger">{res.error}</span>}
    </form>
  );
}

export function BlockButton({ target, blocked }: { target: string; blocked: boolean }) {
  const [res, action, pending] = useActionState(blockAction, null);
  const [dialog, guard] = useConfirm();
  useEffect(() => {
    if (res?.ok) toast("已更新封鎖設定");
  }, [res]);
  return (
    <form action={action} onSubmit={guard(blocked ? null : { message: "封鎖後雙方無法私訊、加好友或交易，並會解除好友與追蹤。確定封鎖？", confirmLabel: "封鎖" })}>
      {dialog}
      <input type="hidden" name="target" value={target} />
      <button name="intent" value={blocked ? "unblock" : "block"} className="text-xs text-faint hover:text-danger" disabled={pending}>
        {blocked ? "解除封鎖" : "封鎖"}
      </button>
      {res && !res.ok && <span className="ml-2 text-xs text-danger">{res.error}</span>}
    </form>
  );
}
