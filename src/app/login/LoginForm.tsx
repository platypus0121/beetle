"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { requestPasswordReset, signIn, signUp } from "./actions";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  x: "X",
  "custom:line": "LINE",
};

export function LoginForm({ next, providers, initialError }: { next: string; providers: string[]; initialError?: string }) {
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [inState, inAction, inPending] = useActionState(signIn, null);
  const [upState, upAction, upPending] = useActionState(signUp, null);
  const [rsState, rsAction, rsPending] = useActionState(requestPasswordReset, null);
  const [oauthError, setOauthError] = useState<string | null>(initialError ?? null);

  async function oauth(provider: string) {
    setOauthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      // LINE 以 Supabase 的自訂 OIDC provider 接入（custom:line）
      provider: provider as "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setOauthError("這個登入方式尚未啟用");
  }

  const state = mode === "in" ? inState : mode === "up" ? upState : rsState;
  const error = state && !state.ok ? state.error : oauthError;

  if (mode === "up" && upState?.ok) {
    return <p className="notice">驗證信已寄出，請到信箱點擊連結完成註冊。</p>;
  }

  return (
    <div className="space-y-5">
      {providers.length > 0 && mode !== "reset" && (
        <>
          <div className="grid gap-2">
            {providers.map((p) => (
              <button key={p} type="button" className="btn w-full" onClick={() => oauth(p)}>
                使用 {PROVIDER_LABEL[p] ?? p} 繼續
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" />或<span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="notice notice-danger">
          {error}
        </p>
      )}
      {mode === "reset" && rsState?.ok && <p className="notice">如果這個信箱有註冊，重設密碼的信已寄出。</p>}

      <form action={mode === "in" ? inAction : mode === "up" ? upAction : rsAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="input" />
        </div>
        {mode !== "reset" && (
          <div>
            <label className="label" htmlFor="password">
              密碼
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "up" ? 8 : undefined}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              className="input"
            />
            {mode === "up" && <p className="hint">至少 8 個字元</p>}
          </div>
        )}
        {mode === "up" && (
          <label className="flex items-start gap-2 text-sm text-sub">
            <input type="checkbox" name="agree" required className="mt-1 size-4 accent-accent" />
            <span>
              我已閱讀並同意
              <Link href="/rules" target="_blank" className="text-accent underline">
                站規
              </Link>
              、
              <Link href="/terms" target="_blank" className="text-accent underline">
                服務條款
              </Link>
              與
              <Link href="/privacy" target="_blank" className="text-accent underline">
                隱私權政策
              </Link>
            </span>
          </label>
        )}
        <button className="btn btn-primary w-full" disabled={inPending || upPending || rsPending}>
          {mode === "in" ? "登入" : mode === "up" ? "註冊" : "寄送重設密碼信"}
        </button>
      </form>

      <div className="flex justify-between text-sm">
        {mode === "in" ? (
          <>
            <button type="button" className="text-accent" onClick={() => setMode("up")}>
              還沒有帳號？註冊
            </button>
            <button type="button" className="text-sub" onClick={() => setMode("reset")}>
              忘記密碼
            </button>
          </>
        ) : (
          <button type="button" className="text-accent" onClick={() => setMode("in")}>
            已有帳號？登入
          </button>
        )}
      </div>
    </div>
  );
}
