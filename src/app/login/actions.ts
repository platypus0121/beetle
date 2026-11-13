"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { fail, type ActionResult } from "@/lib/result";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(_: unknown, form: FormData): Promise<ActionResult> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!email.success || !password) return fail("請輸入 Email 與密碼");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password,
    options: { captchaToken: (form.get("cf-turnstile-response") as string) || undefined },
  });
  if (error) {
    if (error.code === "email_not_confirmed") return fail("請先到信箱點擊驗證連結");
    if (error.status === 429) return fail("嘗試次數過多，請稍後再試");
    return fail("Email 或密碼不正確");
  }
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: unknown, form: FormData): Promise<ActionResult<{ needsConfirm: boolean }>> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));
  if (!email.success) return fail(email.error.issues[0].message);
  if (!password.success) return fail(password.error.issues[0].message);
  if (form.get("agree") !== "on") return fail("請先勾選同意站規與服務條款");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      captchaToken: (form.get("cf-turnstile-response") as string) || undefined,
    },
  });
  if (error) {
    if (error.status === 429) return fail("嘗試次數過多，請稍後再試");
    if (error.code === "weak_password") return fail("密碼強度不足，請換一組");
    if (error.code === "captcha_failed") return fail("驗證未通過，請重試");
    return fail("註冊失敗，請確認 Email 是否正確或稍後再試");
  }
  if (data.session) redirect("/welcome");
  return { ok: true, data: { needsConfirm: true } };
}

export async function requestPasswordReset(_: unknown, form: FormData): Promise<ActionResult> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return fail(email.error.issues[0].message);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/settings/password`,
  });
  // 不論信箱是否存在都回覆成功，避免被用來探測帳號
  return { ok: true };
}
