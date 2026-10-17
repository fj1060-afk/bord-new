import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { can, LEVELS } from "@/lib/permissions";
import { MeetingsTable } from "@/app/(app)/meetings/_components/meetings-table";
import { MeetingStats } from "@/app/(app)/meetings/_components/meeting-stats";
import { committeeOf } from "../../_committee";

export const metadata: Metadata = { title: "الاجتماعات" };

export default async function CommitteeMeetingsPage({ params, searchParams }: PageProps<"/committees/[committeeId]/meetings">) {
  const viewer = await requirePage("/meetings");
  const { committeeId } = await params;
  const committee = await committeeOf(committeeId);
  return (
    <>
      <PageHeader
        section={committee.name}
        title="الاجتماعات"
        description="جدولة الاجتماعات وإصدار الدعوات ومتابعة المحاضر."
        actions={
          can(viewer.permissions, "/meetings", LEVELS.edit) && (
            <Link href={`/meetings/new?body=committee:${committee.id}`} className={buttonClass()}>
              <Plus size={16} aria-hidden="true" /> اجتماع جديد
            </Link>
          )
        }
      />
      <MeetingStats scope={{ committee: committee.id }} />
      <MeetingsTable base={`/committees/${committee.id}/meetings`} params={await searchParams} scope={{ committee: committee.id }} />
    </>
  );
}
