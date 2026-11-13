import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SubmitSpeciesForm } from "./SubmitSpeciesForm";

export const metadata: Metadata = { title: "提報新物種" };

export default async function SubmitSpeciesPage() {
  await requireSession("/species/submit");
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="提報新物種" sub="物種表沒有你要的蟲？填寫後由版主審核加入。範圍限鍬形蟲、兜蟲、金龜。" />
      <SubmitSpeciesForm />
    </div>
  );
}
