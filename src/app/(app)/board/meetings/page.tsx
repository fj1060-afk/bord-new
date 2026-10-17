import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { MeetingsTable } from "@/app/(app)/meetings/_components/meetings-table";
import { MeetingStats } from "@/app/(app)/meetings/_components/meeting-stats";
import { activeBoard, NoBoard } from "../_parts/board";

export const metadata: Metadata = { title: "اجتماعات المجلس" };

export default async function BoardMeetingsPage({ searchParams }: PageProps<"/board/meetings">) {
  const viewer = await requirePage("/meetings");
  const board = await activeBoard();
  if (!board) return <NoBoard canManage={can(viewer.permissions, "/board", LEVELS.manage)} />;
  return (
    <>
      <PageHeader
        section="مجلس الإدارة"
        title="اجتماعات المجلس"
        description="جدولة الاجتماعات وإصدار الدعوات ومتابعة المحاضر."
        actions={
          can(viewer.permissions, "/meetings", LEVELS.edit) && (
            <Link href={`/meetings/new?body=board:${board.id}`} className={buttonClass()}>
              <Plus size={16} aria-hidden="true" /> اجتماع جديد
            </Link>
          )
        }
      />
      <MeetingStats scope={{ board: board.id }} />
      <MeetingsTable base="/board/meetings" params={await searchParams} scope={{ board: board.id }} />
    </>
  );
}
