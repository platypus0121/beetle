import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { WantedForm } from "./WantedForm";

export const metadata: Metadata = { title: "刊登徵求" };

export default async function NewWantedPage() {
  const session = await requireSession("/market/wanted/new");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="刊登徵求" sub="說明你想找的品種、條件與預算，有貨的賣家會私訊你。" />
      <WantedForm defaultCity={session.profile.city} />
    </div>
  );
}
