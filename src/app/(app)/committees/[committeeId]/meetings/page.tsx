import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { ScopeMeetings } from "../../../_scope/lists";
import { committeeOf } from "../../_committee";

export const metadata: Metadata = { title: "الاجتماعات" };

export default async function CommitteeMeetingsPage({ params }: PageProps<"/committees/[committeeId]/meetings">) {
  const viewer = await requirePage("/meetings");
  const { committeeId } = await params;
  const committee = await committeeOf(committeeId);
  return (
    <>
      <PageHeader section={committee.name} title="الاجتماعات" />
      <ScopeMeetings scope={{ committee: committee.id }} canEdit={can(viewer.permissions, "/meetings", LEVELS.edit)} />
    </>
  );
}
