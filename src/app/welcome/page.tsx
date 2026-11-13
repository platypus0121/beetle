import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WelcomeForm } from "./WelcomeForm";

export const metadata: Metadata = { title: "歡迎加入", robots: { index: false } };

export default async function WelcomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.onboarded) redirect("/");
  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="page-title mb-1">歡迎加入</h1>
      <p className="mb-6 text-sm text-sub">先取一個暱稱，其他會員會用它認識你。</p>
      <WelcomeForm suggested={session.profile.username.startsWith("user_") ? "" : session.profile.username} />
    </div>
  );
}
