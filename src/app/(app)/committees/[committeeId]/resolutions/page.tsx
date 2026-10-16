import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { ScopeResolutions } from "../../../_scope/lists";
import { committeeOf } from "../../_committee";

export const metadata: Metadata = { title: "القرارات" };

export default async function CommitteeResolutionsPage({ params }: PageProps<"/committees/[committeeId]/resolutions">) {
  await requirePage("/resolutions");
  const { committeeId } = await params;
  const committee = await committeeOf(committeeId);
  return (
    <>
      <PageHeader section={committee.name} title="القرارات" />
      <ScopeResolutions scope={{ committee: committee.id }} />
    </>
  );
}
