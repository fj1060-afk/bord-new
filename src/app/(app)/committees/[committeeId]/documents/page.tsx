import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { ScopeDocuments } from "../../../_scope/lists";
import { committeeOf } from "../../_committee";

export const metadata: Metadata = { title: "المستندات" };

export default async function CommitteeDocumentsPage({ params }: PageProps<"/committees/[committeeId]/documents">) {
  await requirePage("/documents");
  const { committeeId } = await params;
  const committee = await committeeOf(committeeId);
  return (
    <>
      <PageHeader section={committee.name} title="المستندات" />
      <ScopeDocuments scope={{ committee: committee.id }} />
    </>
  );
}
