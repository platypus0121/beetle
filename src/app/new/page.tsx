import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "發布" };

const OPTIONS = [
  { href: "/posts/new", title: "發表文章", desc: "分享飼育心得、照片、影片，或提出問題" },
  { href: "/market/new", title: "上架商品", desc: "直購或拍賣，活體、標本、用品都可以" },
  { href: "/market/wanted/new", title: "刊登徵求", desc: "想找特定品種或用品，讓賣家來找你" },
  { href: "/breeding/new", title: "新增飼育個體", desc: "記錄體重、換瓶、羽化與血統" },
];

export default async function NewPage() {
  await requireSession("/new");
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="要發布什麼？" />
      <ul className="space-y-2">
        {OPTIONS.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className="card block px-4 py-3.5 hover:bg-wash">
              <div className="font-medium">{o.title}</div>
              <div className="mt-0.5 text-sm text-sub">{o.desc}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
