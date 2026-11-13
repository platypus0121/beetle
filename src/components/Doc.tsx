import type { ReactNode } from "react";

export function Doc({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl text-[15px] leading-relaxed [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-[17px] [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="page-title">{title}</h1>
      <p className="text-xs text-sub">最後更新：{updated}</p>
      {children}
    </article>
  );
}
