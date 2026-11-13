import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "../SettingsForms";

export const metadata: Metadata = { title: "變更密碼", robots: { index: false } };

export default async function PasswordPage() {
  if (!(await getSession())) redirect("/login?next=/settings/password");
  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="變更密碼" />
      <PasswordForm />
    </div>
  );
}
