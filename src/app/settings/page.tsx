import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BlockButton } from "@/components/SocialButtons";
import { PageHeader } from "@/components/ui";
import { deletePayoutAccount } from "./actions";
import { NotificationForm, ProfileForm } from "./SettingsForms";

export const metadata: Metadata = { title: "設定", robots: { index: false } };

export default async function SettingsPage() {
  const { profile, userId } = await requireSession("/settings");
  const supabase = await createClient();
  const [{ data: ns }, { data: payouts }, { data: blocks }] = await Promise.all([
    supabase.from("notification_settings").select("type").eq("user_id", userId).eq("enabled", false),
    supabase.from("seller_payout_accounts").select("*").eq("user_id", userId).order("id"),
    supabase.from("blocks").select("blocked:profiles!blocks_blocked_id_fkey(id, username)").eq("blocker_id", userId),
  ]);
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader title="設定" />
      <section>
        <h2 className="mb-3 font-semibold">個人資料</h2>
        <ProfileForm p={profile} />
      </section>
      <section>
        <h2 className="mb-3 font-semibold">通知</h2>
        <NotificationForm disabled={(ns ?? []).map((n) => n.type)} />
      </section>
      <section>
        <h2 className="mb-1 font-semibold">常用收款帳戶</h2>
        <p className="mb-2 text-xs text-sub">只有你看得到。成立交易時可以直接帶入交易單，不會顯示在個人頁或私訊。</p>
        {payouts?.length ? (
          <ul className="divide-y divide-line border-y border-line text-sm">
            {payouts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span className="font-mono">
                  ({a.bank_code}) {a.account_no} <span className="font-sans">{a.account_name}</span>
                </span>
                <form action={deletePayoutAccount}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-xs text-sub hover:text-danger">刪除</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-sub">還沒有儲存的帳戶。在交易單填寫收款資訊時勾選「存為常用收款帳戶」即可。</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">封鎖名單</h2>
        {blocks?.length ? (
          <ul className="divide-y divide-line border-y border-line text-sm">
            {blocks.map(
              (b) =>
                b.blocked && (
                  <li key={b.blocked.id} className="flex items-center justify-between py-2">
                    <Link href={`/u/${b.blocked.id}`}>{b.blocked.username}</Link>
                    <BlockButton target={b.blocked.id} blocked />
                  </li>
                ),
            )}
          </ul>
        ) : (
          <p className="text-sm text-sub">沒有封鎖任何人。</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">帳號</h2>
        <Link href="/settings/password" className="btn btn-sm">
          變更密碼
        </Link>
      </section>
    </div>
  );
}
