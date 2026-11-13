"use client";
import { useActionState, useState } from "react";
import { FormError, Submit } from "@/components/Submit";
import { submitReview } from "../../actions";

export function ReviewForm({ orderId }: { orderId: number }) {
  const [state, action] = useActionState(submitReview, null);
  const [rating, setRating] = useState(5);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="rating" value={rating} />
      <FormError state={state} />
      <div role="radiogroup" aria-label="評分" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} 星`} onClick={() => setRating(n)} className={`flex size-12 items-center justify-center text-3xl ${n <= rating ? "text-amber-500" : "text-line"}`}>
            ★
          </button>
        ))}
      </div>
      <textarea name="body" rows={3} maxLength={500} placeholder="交易過程如何？（選填）" className="input" />
      <Submit className="btn btn-primary w-full">送出評價</Submit>
    </form>
  );
}
