"use client";
import { useActionState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { deleteListing } from "../actions";

export function DeleteListing({ id }: { id: number }) {
  const [state, action, pending] = useActionState(deleteListing, null);
  const [dialog, guard] = useConfirm();
  return (
    <form
      action={action}
      onSubmit={guard({ message: "確定刪除這件商品？刪除後無法復原。", confirmLabel: "刪除" })}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-sub hover:text-danger" disabled={pending}>
        刪除商品
      </button>
      {dialog}
      {state && !state.ok && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
