"use client";
import { useActionState } from "react";
import { CITIES } from "@/lib/constants";
import { completeProfile } from "./actions";

export function WelcomeForm({ suggested }: { suggested: string }) {
  const [state, action, pending] = useActionState(completeProfile, null);
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && (
        <p role="alert" className="notice notice-danger">
          {state.error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="username">
          暱稱
        </label>
        <input id="username" name="username" required minLength={2} maxLength={20} defaultValue={suggested} className="input" autoComplete="nickname" />
        <p className="hint">2–20 個字，之後可以在設定中修改</p>
      </div>
      <div>
        <label className="label" htmlFor="city">
          所在縣市（選填）
        </label>
        <select id="city" name="city" className="input" defaultValue="">
          <option value="">不顯示</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <p className="hint">方便買賣雙方判斷能否面交</p>
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>
        開始使用
      </button>
    </form>
  );
}
