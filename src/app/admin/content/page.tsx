import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HiddenToggle } from "../AdminForms";

const TYPES = { post: "文章", comment: "留言", listing: "商品", wanted: "徵求" } as const;

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const sp = await searchParams;
  const type = sp.type && sp.type in TYPES ? (sp.type as keyof typeof TYPES) : "post";
  const id = Number(sp.id) || 0;
  const supabase = await createClient();
  let found: { title: string; hidden: boolean; link: string } | null = null;
  if (id) {
    if (type === "post") {
      const { data } = await supabase.from("posts").select("title, status").eq("id", id).maybeSingle();
      if (data) found = { title: data.title, hidden: data.status === "hidden", link: `/posts/${id}` };
    } else if (type === "comment") {
      const { data } = await supabase.from("comments").select("body, status, post_id").eq("id", id).maybeSingle();
      if (data) found = { title: data.body.slice(0, 80), hidden: data.status === "hidden", link: `/posts/${data.post_id}#c${id}` };
    } else if (type === "listing") {
      const { data } = await supabase.from("listings").select("title, status").eq("id", id).maybeSingle();
      if (data) found = { title: data.title, hidden: data.status === "hidden", link: `/market/${id}` };
    } else {
      const { data } = await supabase.from("wanted_listings").select("title, status").eq("id", id).maybeSingle();
      if (data) found = { title: data.title, hidden: data.status === "hidden", link: `/market/wanted/${id}` };
    }
  }
  const [{ data: hiddenPosts }, { data: hiddenListings }] = await Promise.all([
    supabase.from("posts").select("id, title").eq("status", "hidden").order("updated_at", { ascending: false }).limit(30),
    supabase.from("listings").select("id, title").eq("status", "hidden").order("updated_at", { ascending: false }).limit(30),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="page-title">內容管理</h1>
      <form className="flex gap-2">
        <select name="type" defaultValue={type} className="input w-28" aria-label="類型">
          {Object.entries(TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input name="id" defaultValue={id || ""} inputMode="numeric" placeholder="編號（網址最後的數字）" aria-label="編號" className="input" />
        <button className="btn">查詢</button>
      </form>
      {id > 0 &&
        (found ? (
          <div className="card space-y-3 p-4">
            <Link href={found.link} target="_blank" className="font-medium text-accent underline">
              {found.title}
            </Link>
            <p className="text-sm text-sub">目前狀態：{found.hidden ? "已隱藏" : "公開"}</p>
            <HiddenToggle type={type} id={id} hidden={found.hidden} />
          </div>
        ) : (
          <p className="notice">找不到這筆內容。</p>
        ))}
      <section>
        <h2 className="mb-2 font-semibold">已隱藏的內容</h2>
        <ul className="divide-y divide-line text-sm">
          {(hiddenPosts ?? []).map((p) => (
            <li key={`p${p.id}`} className="py-2">
              <Link href={`/admin/content?type=post&id=${p.id}`} className="hover:underline">
                <span className="chip mr-2">文章</span>
                {p.title}
              </Link>
            </li>
          ))}
          {(hiddenListings ?? []).map((l) => (
            <li key={`l${l.id}`} className="py-2">
              <Link href={`/admin/content?type=listing&id=${l.id}`} className="hover:underline">
                <span className="chip mr-2">商品</span>
                {l.title}
              </Link>
            </li>
          ))}
          {!hiddenPosts?.length && !hiddenListings?.length && <li className="py-2 text-sub">沒有被隱藏的文章或商品。</li>}
        </ul>
      </section>
    </div>
  );
}
