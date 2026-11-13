import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Tables } from "./supabase/database.types";

export type Profile = Tables<"profiles">;

// 同一個請求內只查一次
export const getSession = cache(async (): Promise<{ userId: string; profile: Profile } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile) return null;
  return { userId: data.user.id, profile };
});

export async function requireSession(next?: string) {
  const session = await getSession();
  if (!session) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (!session.profile.onboarded) redirect("/welcome");
  return session;
}

export function isBanned(p: Pick<Profile, "banned_until">) {
  return !!p.banned_until && new Date(p.banned_until) > new Date();
}
export function isMod(p: Pick<Profile, "role">) {
  return p.role === "moderator" || p.role === "admin";
}
