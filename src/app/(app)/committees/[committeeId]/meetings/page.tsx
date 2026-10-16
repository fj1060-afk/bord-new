import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { MeetingsTable } from "@/app/(app)/meetings/_components/meetings-table";
import { committeeOf } from "../../_committee";

export const metadata: Metadata = { title: "الاجتماعات" };

export default async function CommitteeMeetingsPage({ params, searchParams }: PageProps<"/committees/[committeeId]/meetings">) {
  await requirePage("/meetings");
  const { committeeId } = await params;
  const committee = await committeeOf(committeeId);
  return (
    <>
      <PageHeader section={committee.name} title="الاجتماعات" />
      <MeetingsTable base={`/committees/${committee.id}/meetings`} params={await searchParams} scope={{ committee: committee.id }} />
    </>
  );
}
