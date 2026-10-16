import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { ScopeMinutes } from "../../../_scope/lists";
import { committeeOf } from "../../_committee";

export const metadata: Metadata = { title: "المحاضر" };

export default async function CommitteeMinutesPage({ params }: PageProps<"/committees/[committeeId]/minutes">) {
  await requirePage("/minutes");
  const { committeeId } = await params;
  const committee = await committeeOf(committeeId);
  return (
    <>
      <PageHeader section={committee.name} title="المحاضر" />
      <ScopeMinutes scope={{ committee: committee.id }} />
    </>
  );
}
