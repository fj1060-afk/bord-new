import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { MeetingsTable } from "@/app/(app)/meetings/_components/meetings-table";
import { activeBoard, NoBoard } from "../_parts/board";

export const metadata: Metadata = { title: "اجتماعات المجلس" };

export default async function BoardMeetingsPage({ searchParams }: PageProps<"/board/meetings">) {
  const viewer = await requirePage("/meetings");
  const board = await activeBoard();
  if (!board) return <NoBoard canManage={can(viewer.permissions, "/board", LEVELS.manage)} />;
  return (
    <>
      <PageHeader section="مجلس الإدارة" title="اجتماعات المجلس" />
      <MeetingsTable base="/board/meetings" params={await searchParams} scope={{ board: board.id }} />
    </>
  );
}
