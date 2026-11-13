"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/validation";
import { CITIES } from "@/lib/constants";
import { dbError, fail, type ActionResult } from "@/lib/result";

export async function completeProfile(_: unknown, form: FormData): Promise<ActionResult> {
  const username = usernameSchema.safeParse(form.get("username"));
  if (!username.success) return fail(username.error.issues[0].message);
  const city = String(form.get("city") ?? "");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { error } = await supabase
    .from("profiles")
    .update({ username: username.data, city: CITIES.includes(city) ? city : null, onboarded: true })
    .eq("id", auth.user.id);
  if (error) return fail(error.code === "23505" ? "這個暱稱已經有人使用" : dbError(error));
  redirect("/");
}
