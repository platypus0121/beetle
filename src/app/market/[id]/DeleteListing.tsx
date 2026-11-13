"use client";
import { useActionState } from "react";
import { deleteListing } from "../actions";

export function DeleteListing({ id }: { id: number }) {
  const [state, action, pending] = useActionState(deleteListing, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("確定刪除這件商品？")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-sub hover:text-danger" disabled={pending}>
        刪除商品
      </button>
      {state && !state.ok && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
