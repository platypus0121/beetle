import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "登入", robots: { index: false } };

const ALLOWED = ["google", "facebook", "x", "custom:line"];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  if (await getSession()) redirect(next);
  // 只顯示站長在環境變數中啟用的登入方式
  const providers = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .map((s) => (s === "line" ? "custom:line" : s))
    .filter((s) => ALLOWED.includes(s));
  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="page-title mb-1">登入 {SITE_NAME}</h1>
      <p className="mb-6 text-sm text-sub">登入後可以發文、留言、交易與記錄飼育。</p>
      <LoginForm next={next} providers={providers} initialError={sp.error ? "登入失敗，請再試一次" : undefined} />
    </div>
  );
}
