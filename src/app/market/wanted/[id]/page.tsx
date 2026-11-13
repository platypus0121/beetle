import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { price, timeAgo } from "@/lib/format";
import { ReportButton } from "@/components/ReportButton";
import { RichText } from "@/components/RichText";
import { UserLink } from "@/components/ui";
import { closeWanted } from "../../actions";

export const metadata: Metadata = { title: "徵求" };

export default async function WantedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: w } = await supabase
    .from("wanted_listings")
    .select("*, user:profiles!wanted_listings_user_id_fkey(id, username, avatar_path), species(id, common_name, scientific_name)")
    .eq("id", Number(id) || 0)
    .maybeSingle();
  if (!w || !w.user) notFound();
  const session = await getSession();
  const mine = session?.userId === w.user_id;
  return (
    <article className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip chip-accent">徵求</span>
        {w.species && (
          <Link href={`/species/${w.species.id}`} className="chip">
            {w.species.common_name} <span className="sci">{w.species.scientific_name}</span>
          </Link>
        )}
        {w.city && <span className="chip">{w.city}</span>}
        {w.status !== "open" && <span className="chip chip-warn">{w.status === "closed" ? "已結束" : "已被隱藏"}</span>}
      </div>
      <h1 className="mt-2 text-xl font-semibold">{w.title}</h1>
      {w.budget && <p className="mt-1 text-lg font-semibold text-accent">預算 {price(w.budget)}</p>}
      <div className="mt-2 flex items-center gap-2 text-sm text-sub">
        <UserLink user={w.user} />
        <span className="text-xs text-faint">· {timeAgo(w.created_at)}</span>
      </div>
      {w.description && <RichText text={w.description} className="mt-4" />}
      <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        {mine ? (
          <form action={closeWanted} className="flex gap-2">
            <input type="hidden" name="id" value={w.id} />
            {w.status !== "hidden" && (
              <button name="intent" value={w.status === "open" ? "close" : "reopen"} className="btn btn-sm">
                {w.status === "open" ? "結束徵求" : "重新開放"}
              </button>
            )}
            <button name="intent" value="delete" className="btn btn-sm btn-danger">
              刪除
            </button>
          </form>
        ) : session ? (
          <>
            <Link href={`/messages/new?to=${w.user.id}`} className="btn btn-primary btn-sm">
              我有貨，私訊聯絡
            </Link>
            <ReportButton type="wanted" id={w.id} />
          </>
        ) : (
          <Link href={`/login?next=/market/wanted/${w.id}`} className="btn btn-primary btn-sm">
            登入後聯絡
          </Link>
        )}
      </div>
    </article>
  );
}
